import { prisma } from "../prisma";
import { Prisma } from "@prisma/client";

// ─────────────────────────────────────────────────────────────
// pmsStateStore.ts — état partagé des modules back-office qui n'ont pas
// (encore) de modèle métier dédié (réservations multi-canal, yield,
// night audit, CRM, smart locks, stock F&B, planning staff, etc.).
//
// MIGRATION PHASE 1 : persisté dans Postgres (table pms_state, une ligne
// JSON par hôtel) au lieu d'une Map() en mémoire — les données survivent
// désormais au redémarrage du process. Le contrat GET/PATCH exposé par
// routes/pms.routes.ts est inchangé ; à terme, chaque clé pourra migrer
// vers un vrai modèle Prisma dédié, une par une, sans casser l'API.
// ─────────────────────────────────────────────────────────────

export type PmsState = Record<string, unknown>;

export const PMS_STATE_KEYS = [
  "reservations",
  "yieldFactors",
  "invoices",
  "nightAuditLog",
  "auditLog",
  "housekeepingTasks",
  "crmBlacklist",
  "crmSegments",
  "teleDeclarationStatus",
  "smartLocks",
  "fnbStock",
  "waitlist",
  "events",
  "loyaltyMembers",
  "familySafety",
  "staffSchedule",
  "pmsGuests",
  "rooms",
  "services",
  // Carte du room service (id, name, price, cat, active) — SOURCE DE PRIX serveur
  // des paiements en ligne (services/catalogPricing.ts). Chargée par
  // `npm run db:seed:catalog`.
  "menu",
] as const;

export const pmsStateStore = {
  async get(hotelId: string): Promise<PmsState> {
    const rec = await prisma.pmsState.findUnique({ where: { hotelId } });
    return (rec?.state as PmsState) ?? {};
  },

  // Merge superficiel : chaque clé du patch remplace entièrement la
  // valeur existante pour cette clé (le frontend envoie toujours la
  // valeur complète de chaque section qu'il modifie).
  async patch(hotelId: string, patch: PmsState): Promise<PmsState> {
    const current = await pmsStateStore.get(hotelId);
    const next = { ...current, ...patch };
    await prisma.pmsState.upsert({
      where: { hotelId },
      create: { hotelId, state: next as Prisma.InputJsonValue },
      update: { state: next as Prisma.InputJsonValue },
    });
    return next;
  },
};
