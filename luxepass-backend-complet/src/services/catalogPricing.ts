import { AppError } from "../utils/errors";
import { toMinorUnits } from "../utils/money";

// ─────────────────────────────────────────────────────────────
// Tarification CÔTÉ SERVEUR d'une commande payée en ligne.
//
// Le client React n'envoie que des références (`id`) et des quantités ; le
// prix, le libellé et la disponibilité viennent EXCLUSIVEMENT du catalogue
// de l'hôtel stocké en base (pms_state.menu / pms_state.services, éditable
// par reception / gm / super_admin via PATCH /hotels/:hotelId/pms-state).
// Tout `price` ou `name` présent dans le payload client est ignoré (Zod le
// retire avant d'arriver ici, et cette fonction ne l'accepte même pas).
//
// Module sans accès base ni SDK : le catalogue est passé en paramètre, ce
// qui le rend testable seul (catalogPricing.test.ts).
// ─────────────────────────────────────────────────────────────

export type PayableCategory = "room_service" | "spa";

// Forme commune (tolérante) d'une ligne de catalogue : `menu` porte sa
// catégorie dans `cat`, `services` dans `category`.
export interface CatalogEntry {
  id: string;
  name: string;
  price: number; // unités principales (DT)
  active?: boolean;
  cat?: string;
  category?: string;
}

export interface CatalogSnapshot {
  menu?: CatalogEntry[];
  services?: CatalogEntry[];
}

export interface PricedLine {
  id: string;
  name: string;
  qty: number;
  unitAmount: number; // unités mineures (millimes)
}

// Périmètre « spa » : catégories « Spa — … » et « Beauté — … » du catalogue.
const SPA_CATEGORY = /^(Spa|Beauté) — /;

export function priceOrderItems(input: {
  category: PayableCategory;
  items: ReadonlyArray<{ id: string; qty: number }>;
  catalog: CatalogSnapshot;
  currency: string;
}): { lines: PricedLine[]; total: number } {
  const { category, items, catalog, currency } = input;

  const source =
    category === "room_service"
      ? catalog.menu
      : catalog.services?.filter((s) => SPA_CATEGORY.test(s.category ?? ""));

  if (!source) {
    // Catalogue jamais chargé en base (cf. `npm run db:seed:catalog`) :
    // erreur de configuration, pas une faute du client.
    throw new AppError(503, "catalog_unavailable", "Catalogue indisponible, réessayez plus tard");
  }

  const byId = new Map(source.map((e) => [e.id, e]));

  // Un même article envoyé deux fois est fusionné (quantités additionnées).
  const qtyById = new Map<string, number>();
  for (const it of items) qtyById.set(it.id, (qtyById.get(it.id) ?? 0) + it.qty);

  const lines: PricedLine[] = [];
  let total = 0;
  for (const [id, qty] of qtyById) {
    const entry = byId.get(id);
    if (!entry || entry.active === false) {
      throw new AppError(422, "unknown_item", `Article indisponible : ${id}`, { itemId: id });
    }
    const unitAmount = toMinorUnits(entry.price, currency);
    if (unitAmount <= 0) {
      throw new AppError(422, "item_not_payable", `Article non payable en ligne : ${id}`, { itemId: id });
    }
    lines.push({ id, name: entry.name, qty, unitAmount });
    total += unitAmount * qty;
  }

  if (!Number.isSafeInteger(total) || total <= 0) {
    throw new AppError(422, "invalid_amount", "Montant de commande invalide");
  }
  return { lines, total };
}
