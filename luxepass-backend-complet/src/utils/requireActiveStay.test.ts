import { test } from "node:test";
import assert from "node:assert/strict";
import { checkinStore, CheckinSessionRecord } from "../store/checkinStore";
import {
  requireActiveStay,
  requireOpenStay,
  requireActiveStayWithPayment,
} from "./requireActiveStay";
import { ConflictError, NotFoundError } from "./errors";

// ─────────────────────────────────────────────────────────────
// Régression : les routes d'écriture (orders, service-requests,
// maintenance-reports, notes, concierge/messages) doivent refuser un
// séjour déjà `checked_out`, pour éviter des enregistrements « fantômes »
// créés après le départ effectif du client, même avec un `stayToken`
// encore valide (pas de révocation, §11).
//
// checkinStore est un objet littéral (pas une classe) : on peut remplacer
// `findByStayId` pour ces tests sans dépendance à Prisma/Postgres.
// ─────────────────────────────────────────────────────────────

function fakeSession(overrides: Partial<CheckinSessionRecord> = {}): CheckinSessionRecord {
  return {
    id: "cis_1",
    hotelId: "hotel_1",
    hotelSlug: "hotel-1",
    stage: "completed",
    pmsSynced: false,
    createdAt: new Date(),
    stayId: "stay_1",
    paymentMethod: { pspToken: "dev_placeholder_1", last4: "4242", brand: "visa" } as any,
    ...overrides,
  };
}

function withFakeFindByStayId<T>(session: CheckinSessionRecord | undefined, fn: () => Promise<T>) {
  const original = checkinStore.findByStayId;
  checkinStore.findByStayId = async () => session;
  return fn().finally(() => {
    checkinStore.findByStayId = original;
  });
}

test("requireActiveStay : accepte completed ET checked_out (lecture)", async () => {
  await withFakeFindByStayId(fakeSession({ stage: "completed" }), async () => {
    assert.equal((await requireActiveStay("stay_1")).stage, "completed");
  });
  await withFakeFindByStayId(fakeSession({ stage: "checked_out" }), async () => {
    assert.equal((await requireActiveStay("stay_1")).stage, "checked_out");
  });
});

test("requireActiveStay : séjour inconnu → NotFoundError", async () => {
  await withFakeFindByStayId(undefined, async () => {
    await assert.rejects(() => requireActiveStay("stay_x"), NotFoundError);
  });
});

test("requireOpenStay : rejette un séjour checked_out (409)", async () => {
  await withFakeFindByStayId(fakeSession({ stage: "checked_out" }), async () => {
    await assert.rejects(() => requireOpenStay("stay_1"), ConflictError);
  });
});

test("requireOpenStay : accepte un séjour completed", async () => {
  await withFakeFindByStayId(fakeSession({ stage: "completed" }), async () => {
    assert.equal((await requireOpenStay("stay_1")).stage, "completed");
  });
});

test("requireActiveStayWithPayment : rejette checked_out avant même de vérifier le paiement", async () => {
  await withFakeFindByStayId(
    fakeSession({ stage: "checked_out", paymentMethod: null }),
    async () => {
      await assert.rejects(() => requireActiveStayWithPayment("stay_1"), ConflictError);
    }
  );
});

test("requireActiveStayWithPayment : rejette l'absence de moyen de paiement sur un séjour ouvert", async () => {
  await withFakeFindByStayId(
    fakeSession({ stage: "completed", paymentMethod: null }),
    async () => {
      await assert.rejects(() => requireActiveStayWithPayment("stay_1"), ConflictError);
    }
  );
});
