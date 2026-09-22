import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

// ─────────────────────────────────────────────────────────────
// Test d'intégration du garde /stays/:stayId/* (ACTION 1, Phase 0).
// Monte le VRAI requireStayAuth + le VRAI errorHandler dans une petite app
// Express, exactement comme index.ts (`app.use("/stays/:stayId", …)`), et
// l'appelle en HTTP. Il vérifie surtout ce qu'un test unitaire ne peut pas :
// que `req.params.stayId` est bien disponible dans un middleware monté avec un
// paramètre de chemin, et que l'ordre qr-verify / garde est correct.
//
// Aucune base de données : les handlers sont factices. `config.ts` exige
// DATABASE_URL au chargement → valeur bidon posée avant l'import dynamique.
// Lancer : npm test
// ─────────────────────────────────────────────────────────────

let server: Server;
let base = "";
let signStayToken: typeof import("../utils/jwt").signStayToken;
let secret = "";
let accessSecret = "";
let jwt: typeof import("jsonwebtoken");

before(async () => {
  process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";

  const express = (await import("express")).default;
  jwt = (await import("jsonwebtoken")).default;
  const { config } = await import("../config");
  const { makeRequireStayAuth } = await import("./requireStayAuth");
  // Fausse « base » : stay_A appartient à hotel_1, stay_B à hotel_2. Sert
  // uniquement au chemin STAFF (isolation par hôtel) — pas de vraie DB ici.
  const stayHotels: Record<string, string> = { stay_A: "hotel_1", stay_B: "hotel_2" };
  const requireStayAuth = makeRequireStayAuth({
    findStayHotelId: async (stayId) => stayHotels[stayId],
  });
  const { errorHandler } = await import("./errorHandler");
  ({ signStayToken } = await import("../utils/jwt"));
  secret = config.stay.jwtSecret;
  accessSecret = config.jwt.accessSecret;

  const app = express();
  // Déclaré AVANT le garde, comme checkinRouter dans index.ts.
  app.get("/stays/:stayId/qr-verify", (_req, res) => res.json({ public: true }));
  app.use("/stays/:stayId", requireStayAuth);
  app.get("/stays/:stayId/notes", (req, res) =>
    res.json({ stayId: req.params.stayId, session: req.staySession })
  );
  app.post("/stays/:stayId/checkout", (_req, res) => res.json({ done: true }));
  // Le garde couvre aussi les routes qui n'existent pas (fail-closed).
  app.use(errorHandler);

  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server?.close();
});

const tokenFor = (stayId: string) =>
  signStayToken({
    stayId,
    hotelId: "hotel_1",
    room: "204",
    guestName: "Sami Ben Ali",
    departure: "2099-01-01",
    createdAt: new Date(),
  });

async function call(
  path: string,
  opts: { method?: string; token?: string; auth?: string; xStayToken?: string } = {}
) {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.auth) headers.Authorization = opts.auth;
  if (opts.xStayToken !== undefined) headers["X-Stay-Token"] = opts.xStayToken;
  const res = await fetch(base + path, { method: opts.method ?? "GET", headers });
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}

test("sans token → 401 stay_token_missing", async () => {
  const r = await call("/stays/stay_A/notes");
  assert.equal(r.status, 401);
  assert.equal(r.body.error, "stay_token_missing");
});

test("token valide (Authorization: Bearer) → 200, req.staySession posé, params.stayId lu correctement", async () => {
  const r = await call("/stays/stay_A/notes", { token: tokenFor("stay_A") });
  assert.equal(r.status, 200);
  assert.equal(r.body.stayId, "stay_A");
  assert.equal(r.body.session.stayId, "stay_A");
  assert.equal(r.body.session.hotelId, "hotel_1");
  assert.equal(r.body.session.room, "204");
  assert.equal(r.body.session.guestName, "Sami Ben Ali");
  assert.equal(r.body.session.type, "stay_pass");
});

test("token du séjour A sur le séjour B → 403 forbidden", async () => {
  const r = await call("/stays/stay_B/notes", { token: tokenFor("stay_A") });
  assert.equal(r.status, 403);
  assert.equal(r.body.error, "forbidden");
});

test("comparaison stricte du stayId : casse, préfixe et suffixe refusés", async () => {
  const tok = tokenFor("stay_A");
  for (const other of ["stay_a", "stay_A2", "stay_", "STAY_A"]) {
    const r = await call(`/stays/${other}/notes`, { token: tok });
    assert.equal(r.status, 403, other);
  }
});

test("X-Stay-Token seul → 200 et req.staySession posé", async () => {
  const r = await call("/stays/stay_A/notes", { xStayToken: tokenFor("stay_A") });
  assert.equal(r.status, 200);
  assert.equal(r.body.session.stayId, "stay_A");
});

test("X-Stay-Token d'un autre séjour → 403 forbidden", async () => {
  const r = await call("/stays/stay_B/notes", { xStayToken: tokenFor("stay_A") });
  assert.equal(r.status, 403);
  assert.equal(r.body.error, "forbidden");
});

test("X-Stay-Token prioritaire : un Bearer staff dans Authorization ne gêne pas", async () => {
  const r = await call("/stays/stay_A/notes", {
    xStayToken: tokenFor("stay_A"),
    auth: "Bearer un.jeton.staff",
  });
  assert.equal(r.status, 200);
});

test("X-Stay-Token invalide + Bearer valide → 401 (pas de repli sur Authorization)", async () => {
  const r = await call("/stays/stay_A/notes", { xStayToken: "garbage", token: tokenFor("stay_A") });
  assert.equal(r.status, 401);
  assert.equal(r.body.error, "stay_token_invalid");
});

test("X-Stay-Token vide → ignoré, repli sur Authorization: Bearer", async () => {
  const r = await call("/stays/stay_A/notes", { xStayToken: "  ", token: tokenFor("stay_A") });
  assert.equal(r.status, 200);
});

test("token expiré → 401 stay_token_expired", async () => {
  const expired = jwt.sign(
    { stayId: "stay_A", hotelId: "hotel_1", guestName: "X", type: "stay_pass" },
    secret,
    { algorithm: "HS256", expiresIn: -10 }
  );
  const r = await call("/stays/stay_A/notes", { token: expired });
  assert.equal(r.status, 401);
  assert.equal(r.body.error, "stay_token_expired");
});

test("token signé avec un autre secret (ex. staff) → 401 stay_token_invalid", async () => {
  const forged = jwt.sign(
    { stayId: "stay_A", hotelId: "hotel_1", guestName: "X", type: "stay_pass" },
    "un-autre-secret-qui-n-est-pas-celui-du-sejour",
    { algorithm: "HS256", expiresIn: 60 }
  );
  const r = await call("/stays/stay_A/notes", { token: forged });
  assert.equal(r.status, 401);
  assert.equal(r.body.error, "stay_token_invalid");
});

test("bon secret mais mauvais type de token → 401 stay_token_invalid", async () => {
  const wrongType = jwt.sign(
    { sub: "staff_1", hotelId: "hotel_1", role: "super_admin", type: "access" },
    secret,
    { algorithm: "HS256", expiresIn: 60 }
  );
  const r = await call("/stays/stay_A/notes", { token: wrongType });
  assert.equal(r.status, 401);
  assert.equal(r.body.error, "stay_token_invalid");
});

test("le checkout (POST) est aussi protégé", async () => {
  assert.equal((await call("/stays/stay_A/checkout", { method: "POST" })).status, 401);
  assert.equal((await call("/stays/stay_A/checkout", { method: "POST", token: tokenFor("stay_A") })).status, 200);
});

test("route inexistante sous /stays/:stayId → 401 (fail-closed), pas 404", async () => {
  const r = await call("/stays/stay_A/nimporte-quoi");
  assert.equal(r.status, 401);
});

test("qr-verify (staff) reste accessible sans stayToken", async () => {
  const r = await call("/stays/stay_A/qr-verify");
  assert.equal(r.status, 200);
  assert.equal(r.body.public, true);
});

// ── Repli STAFF : agir au nom du client (reception / gm / super_admin) ──
const staffToken = (role: string, hotelId = "hotel_1") =>
  jwt.sign({ sub: "staff_1", hotelId, role, type: "access" }, accessSecret, { expiresIn: 900 });

test("staff reception du même hôtel → 200, pas de staySession", async () => {
  const r = await call("/stays/stay_A/notes", { token: staffToken("reception") });
  assert.equal(r.status, 200);
  assert.equal(r.body.session, undefined);
});

test("staff gm du même hôtel → 200 (POST checkout au nom du client)", async () => {
  const r = await call("/stays/stay_A/checkout", { method: "POST", token: staffToken("gm") });
  assert.equal(r.status, 200);
});

test("staff reception d'un AUTRE hôtel → 404 (comme un séjour inexistant)", async () => {
  const other = await call("/stays/stay_B/notes", { token: staffToken("reception", "hotel_1") });
  const missing = await call("/stays/stay_inconnu/notes", { token: staffToken("reception", "hotel_1") });
  assert.equal(other.status, 404);
  assert.equal(missing.status, 404);
});

test("super_admin → 200 sur n'importe quel hôtel", async () => {
  const r = await call("/stays/stay_B/notes", { token: staffToken("super_admin", "hotel_1") });
  assert.equal(r.status, 200);
});

test("housekeeping / maintenance → 403 forbidden", async () => {
  for (const role of ["housekeeping", "maintenance"]) {
    const r = await call("/stays/stay_A/notes", { token: staffToken(role) });
    assert.equal(r.status, 403, role);
    assert.equal(r.body.error, "forbidden");
  }
});

test("JWT staff dans X-Stay-Token → 401 (en-tête client strict)", async () => {
  const r = await call("/stays/stay_A/notes", { xStayToken: staffToken("super_admin") });
  assert.equal(r.status, 401);
  assert.equal(r.body.error, "stay_token_invalid");
});

test("stayToken expiré → 401 stay_token_expired, jamais de repli staff", async () => {
  const expired = jwt.sign(
    { stayId: "stay_A", hotelId: "hotel_1", guestName: "X", type: "stay_pass" },
    secret,
    { algorithm: "HS256", expiresIn: -10 }
  );
  const r = await call("/stays/stay_A/notes", { token: expired });
  assert.equal(r.status, 401);
  assert.equal(r.body.error, "stay_token_expired");
});
