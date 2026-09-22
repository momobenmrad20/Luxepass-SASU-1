import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

// ─────────────────────────────────────────────────────────────
// Test d'intégration du webhook Stripe : monte le VRAI paymentsWebhookRouter
// (express.raw + constructEvent) et le VRAI errorHandler, dans une app où
// express.json() est monté APRÈS, exactement comme index.ts, puis l'appelle en
// HTTP avec de vraies signatures générées par le SDK.
//
// Aucune base : seuls des événements NON gérés (→ 200 sans accès Prisma) et des
// signatures invalides (→ 400 avant tout traitement) sont envoyés. Le chemin
// payment_intent.succeeded / payment_failed touche Postgres : à vérifier de bout
// en bout avec la Stripe CLI (cf. docs/PAYMENTS.md §Tests).
// Lancer : npm test
// ─────────────────────────────────────────────────────────────

let server: Server;
let base = "";
let sign: (payload: string, secret?: string) => string;

const SECRET = "whsec_unit_test_secret_0123456789abcdef";

before(async () => {
  process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
  process.env.STRIPE_SECRET_KEY = "sk_test_51UnitTestKey0000000000";
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;

  const express = (await import("express")).default;
  const { paymentsWebhookRouter } = await import("./payments.routes");
  const { errorHandler } = await import("../middleware/errorHandler");
  const { getStripe } = await import("../services/paymentService");

  sign = (payload, secret = SECRET) =>
    getStripe().webhooks.generateTestHeaderString({ payload, secret });

  const app = express();
  app.use(paymentsWebhookRouter); // AVANT express.json(), comme index.ts
  app.use(express.json());
  app.use(errorHandler);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server?.close();
});

const event = (type: string) =>
  JSON.stringify({ id: "evt_test_1", object: "event", type, data: { object: { id: "cus_1" } } });

async function post(body: string, headers: Record<string, string>) {
  const res = await fetch(`${base}/payments/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

test("signature valide + événement non géré → 200 (accusé de réception)", async () => {
  const body = event("customer.created");
  const r = await post(body, { "Stripe-Signature": sign(body) });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { received: true });
});

test("corps modifié après signature → 400 invalid_signature", async () => {
  const signed = event("customer.created");
  const header = sign(signed);
  const tampered = signed.replace("cus_1", "cus_2");
  const r = await post(tampered, { "Stripe-Signature": header });
  assert.equal(r.status, 400);
  assert.equal(r.json.error, "invalid_signature");
});

test("signature calculée avec un autre secret → 400", async () => {
  const body = event("payment_intent.succeeded");
  const r = await post(body, { "Stripe-Signature": sign(body, "whsec_un_autre_secret_0123456789abcdef") });
  assert.equal(r.status, 400);
  assert.equal(r.json.error, "invalid_signature");
});

test("en-tête Stripe-Signature absent → 400", async () => {
  const r = await post(event("payment_intent.succeeded"), {});
  assert.equal(r.status, 400);
});

test("un payment_intent.succeeded NON signé ne déclenche jamais de traitement", async () => {
  // Si la vérification était contournée, handleWebhookEvent interrogerait Prisma
  // (base factice → 500). On exige un 400 net.
  const r = await post(event("payment_intent.succeeded"), { "Stripe-Signature": "t=1,v1=deadbeef" });
  assert.equal(r.status, 400);
});
