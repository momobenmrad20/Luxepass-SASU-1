import { test } from "node:test";
import assert from "node:assert/strict";
import { AppError } from "../utils/errors";
import { priceOrderItems, type CatalogSnapshot } from "./catalogPricing";

const catalog: CatalogSnapshot = {
  menu: [
    { id: "m1", name: "Salade Tunisienne Mechouia", price: 22, cat: "Entrées", active: true },
    { id: "m2", name: "Bruschetta Trio", price: 28, cat: "Entrées", active: true },
    { id: "m9", name: "Plat retiré de la carte", price: 50, cat: "Plats", active: false },
  ],
  services: [
    { id: "sv1", name: "KO-BI-DO Jeunesse instantanée", price: 120, category: "Spa — Visage Cinq Mondes", active: true },
    { id: "sv90", name: "Court de Tennis", price: 25, category: "Sport", active: true },
    { id: "sv97", name: "Room Service (gratuit)", price: 0, category: "Spa — Test", active: true },
  ],
};

const errCode = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    assert.ok(e instanceof AppError, "AppError attendu");
    return (e as AppError).code;
  }
  assert.fail("aucune erreur levée");
};

test("le total vient du catalogue serveur, en millimes", () => {
  const { lines, total } = priceOrderItems({
    category: "room_service",
    items: [{ id: "m1", qty: 2 }, { id: "m2", qty: 1 }],
    catalog,
    currency: "tnd",
  });
  assert.equal(total, 2 * 22000 + 28000);
  assert.deepEqual(lines[0], { id: "m1", name: "Salade Tunisienne Mechouia", qty: 2, unitAmount: 22000 });
});

test("un prix ou un nom glissé dans le payload est ignoré", () => {
  // Le type n'accepte même pas `price` ; on force l'objet comme le ferait un client malveillant.
  const tampered = [{ id: "m1", qty: 1, price: 0.001, name: "Gratuit" }] as unknown as { id: string; qty: number }[];
  const { lines, total } = priceOrderItems({ category: "room_service", items: tampered, catalog, currency: "tnd" });
  assert.equal(total, 22000);
  assert.equal(lines[0].name, "Salade Tunisienne Mechouia");
});

test("doublons fusionnés", () => {
  const { lines, total } = priceOrderItems({
    category: "room_service",
    items: [{ id: "m1", qty: 1 }, { id: "m1", qty: 2 }],
    catalog,
    currency: "tnd",
  });
  assert.equal(lines.length, 1);
  assert.equal(lines[0].qty, 3);
  assert.equal(total, 66000);
});

test("article inconnu, inactif ou d'une autre catégorie → 422 unknown_item", () => {
  assert.equal(errCode(() => priceOrderItems({ category: "room_service", items: [{ id: "zz", qty: 1 }], catalog, currency: "tnd" })), "unknown_item");
  assert.equal(errCode(() => priceOrderItems({ category: "room_service", items: [{ id: "m9", qty: 1 }], catalog, currency: "tnd" })), "unknown_item");
  // un soin de spa ne se commande pas comme du room service, et inversement
  assert.equal(errCode(() => priceOrderItems({ category: "room_service", items: [{ id: "sv1", qty: 1 }], catalog, currency: "tnd" })), "unknown_item");
  assert.equal(errCode(() => priceOrderItems({ category: "spa", items: [{ id: "m1", qty: 1 }], catalog, currency: "tnd" })), "unknown_item");
});

test("spa : seules les catégories Spa/Beauté sont payables", () => {
  const ok = priceOrderItems({ category: "spa", items: [{ id: "sv1", qty: 1 }], catalog, currency: "tnd" });
  assert.equal(ok.total, 120000);
  assert.equal(errCode(() => priceOrderItems({ category: "spa", items: [{ id: "sv90", qty: 1 }], catalog, currency: "tnd" })), "unknown_item");
});

test("article à prix 0 → non payable en ligne", () => {
  assert.equal(errCode(() => priceOrderItems({ category: "spa", items: [{ id: "sv97", qty: 1 }], catalog, currency: "tnd" })), "item_not_payable");
});

test("catalogue absent → 503 catalog_unavailable (pas un 422 côté client)", () => {
  assert.equal(errCode(() => priceOrderItems({ category: "room_service", items: [{ id: "m1", qty: 1 }], catalog: {}, currency: "tnd" })), "catalog_unavailable");
});
