import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/prisma";
import { pmsStateStore } from "../src/store/pmsStateStore";

// ─────────────────────────────────────────────────────────────
// Charge en base le catalogue de PRIX de l'hôtel Oceana (carte du room
// service + services/spa) : c'est la source de vérité des paiements en
// ligne (services/catalogPricing.ts). Sans lui, POST /payments/create-intent
// répond 503 catalog_unavailable.
//
// Données : prisma/catalog.oceana.json, extraites des constantes MENU_ITEMS et
// SERVICES_CATALOG du frontend (LuxePass.jsx) au moment de l'intégration.
//
// NON destructif : une clé déjà présente dans pms_state (par exemple des
// tarifs modifiés par la réception depuis le PMS) n'est JAMAIS écrasée.
// Pour repartir de zéro, supprimer la clé `menu` / `services` dans
// `npm run db:studio` (table pms_state) puis relancer ce script.
//
// Prérequis : `npm run db:seed` (crée l'hôtel). Lancer : npm run db:seed:catalog
// ─────────────────────────────────────────────────────────────

const HOTEL_ID = "hotel_ocean_asuites";

async function main() {
  const file = path.join(__dirname, "catalog.oceana.json");
  const catalog = JSON.parse(fs.readFileSync(file, "utf8")) as {
    menu: unknown[];
    services: unknown[];
  };

  const hotel = await prisma.hotel.findUnique({ where: { id: HOTEL_ID } });
  if (!hotel) throw new Error(`Hôtel ${HOTEL_ID} introuvable — lancez d'abord: npm run db:seed`);

  const current = await pmsStateStore.get(HOTEL_ID);
  const patch: Record<string, unknown> = {};
  if (!Array.isArray(current.menu)) patch.menu = catalog.menu;
  if (!Array.isArray(current.services)) patch.services = catalog.services;

  if (Object.keys(patch).length === 0) {
    console.log("Catalogue déjà présent (menu + services) — rien à faire.");
    return;
  }
  await pmsStateStore.patch(HOTEL_ID, patch);
  console.log(
    "Catalogue chargé :",
    Object.entries(patch)
      .map(([k, v]) => `${k} (${(v as unknown[]).length} lignes)`)
      .join(", ")
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
