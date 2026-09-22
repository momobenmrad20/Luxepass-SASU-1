import { test } from "node:test";
import assert from "node:assert/strict";
import { currencyExponent, fromMinorUnits, isValidMinorAmount, toMinorUnits } from "./money";

test("TND : 3 décimales — 22 DT = 22000 millimes", () => {
  assert.equal(currencyExponent("TND"), 3);
  assert.equal(toMinorUnits(22, "tnd"), 22000);
  assert.equal(fromMinorUnits(22000, "TND"), 22);
});

test("TND : le dernier chiffre est forcé à 0 (exigence Stripe)", () => {
  assert.equal(toMinorUnits(5.123, "tnd"), 5120);
  assert.equal(toMinorUnits(5.125, "tnd"), 5130);
  assert.equal(toMinorUnits(0.001, "tnd"), 0); // sous le seuil → 0, rejeté ensuite par isValidMinorAmount
});

test("EUR : 2 décimales, JPY : 0 décimale", () => {
  assert.equal(toMinorUnits(19.99, "eur"), 1999);
  assert.equal(toMinorUnits(1.01, "eur"), 101);
  assert.equal(toMinorUnits(500, "jpy"), 500);
});

test("aller-retour sans perte pour les prix du catalogue", () => {
  for (const price of [14, 18, 22, 145, 220, 12.5]) {
    assert.equal(fromMinorUnits(toMinorUnits(price, "tnd"), "tnd"), price);
  }
});

test("montants invalides refusés", () => {
  assert.throws(() => toMinorUnits(-1, "tnd"), RangeError);
  assert.throws(() => toMinorUnits(NaN, "tnd"), RangeError);
  assert.equal(isValidMinorAmount(0, "tnd"), false);
  assert.equal(isValidMinorAmount(22005, "tnd"), false); // pas multiple de 10
  assert.equal(isValidMinorAmount(22010, "tnd"), true);
  assert.equal(isValidMinorAmount(1.5, "eur"), false);
});
