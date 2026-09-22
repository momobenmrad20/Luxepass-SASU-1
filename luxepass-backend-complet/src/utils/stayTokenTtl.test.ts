import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeStayTokenTtlSeconds,
  STAY_TOKEN_MAX_SECONDS,
  secondsUntilAbsoluteCap,
} from "./stayTokenTtl";

const H = 3600;
const now = new Date("2026-09-19T10:00:00Z");

test("expire à la fin du jour de départ + marge (12 h)", () => {
  // départ 2026-09-22 → fin de journée = 2026-09-23T00:00Z, +12 h = 2026-09-23T12:00Z
  // de 2026-09-19T10:00Z : 4 j + 2 h = 98 h
  assert.equal(computeStayTokenTtlSeconds("2026-09-22", now, 12), 98 * H);
});

test("départ le jour même : reste valide jusqu'à la fin du jour + marge", () => {
  // 2026-09-19T10:00Z → 2026-09-20T12:00Z = 26 h
  assert.equal(computeStayTokenTtlSeconds("2026-09-19", now, 12), 26 * H);
});

test("late check-out : encore valide à midi UTC le jour du départ", () => {
  const noonDepartureDay = new Date("2026-09-22T12:30:00Z");
  const ttl = computeStayTokenTtlSeconds("2026-09-22", new Date("2026-09-19T10:00:00Z"), 12)!;
  assert.ok(new Date(now.getTime() + ttl * 1000) > noonDepartureDay);
});

test("pas de date → null (TTL par défaut appliqué par l'appelant)", () => {
  assert.equal(computeStayTokenTtlSeconds(undefined, now, 12), null);
  assert.equal(computeStayTokenTtlSeconds(null, now, 12), null);
  assert.equal(computeStayTokenTtlSeconds("", now, 12), null);
});

test("date mal formée ou impossible → null", () => {
  assert.equal(computeStayTokenTtlSeconds("22/09/2026", now, 12), null);
  assert.equal(computeStayTokenTtlSeconds("2026-9-22", now, 12), null);
  assert.equal(computeStayTokenTtlSeconds("2026-02-31", now, 12), null);
  assert.equal(computeStayTokenTtlSeconds("2026-13-01", now, 12), null);
});

test("départ déjà dépassé (fin de jour + marge écoulées) → null", () => {
  assert.equal(computeStayTokenTtlSeconds("2026-09-10", now, 12), null);
});

test("plafonné à 60 jours pour une date aberrante", () => {
  assert.equal(computeStayTokenTtlSeconds("2099-01-01", now, 12), STAY_TOKEN_MAX_SECONDS);
});

test("marge négative ramenée à 0", () => {
  assert.equal(computeStayTokenTtlSeconds("2026-09-19", now, -5), 14 * H);
});

// ── Plafond absolu (secondsUntilAbsoluteCap) ────────────────────────────
// Régression pour le renouvellement indéfini via GET /pass : le plafond doit
// être ancré sur `createdAt`, pas sur `now`, sans quoi il reculerait à
// chaque renouvellement exactement comme le bug qu'il corrige.

test("plafond absolu : secondes restantes depuis createdAt", () => {
  const createdAt = new Date("2026-09-01T00:00:00Z");
  // createdAt + 30 j = 2026-10-01T00:00Z ; now = 2026-09-19T10:00Z → 11 j 14 h restantes
  const expected = 11 * 24 * H + 14 * H;
  assert.equal(secondsUntilAbsoluteCap(createdAt, now, 30), expected);
});

test("plafond absolu : ne recule pas quand on renouvelle plus tard", () => {
  const createdAt = new Date("2026-09-01T00:00:00Z");
  const early = secondsUntilAbsoluteCap(createdAt, now, 30);
  const later = secondsUntilAbsoluteCap(createdAt, new Date("2026-09-25T10:00:00Z"), 30);
  assert.ok(later < early, "le plafond doit se rapprocher avec le temps, jamais reculer");
});

test("plafond absolu : négatif une fois dépassé", () => {
  const createdAt = new Date("2026-01-01T00:00:00Z");
  assert.ok(secondsUntilAbsoluteCap(createdAt, now, 30) < 0);
});
