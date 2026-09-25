import { nanoid } from "nanoid";
import { Prisma, CheckinStage as PrismaCheckinStage } from "@prisma/client";
import { prisma } from "../prisma";
import type { GuestDataInput, PaymentMethodInput, StayChildInput } from "../schemas";

// ─────────────────────────────────────────────────────────────
// MIGRATION PHASE 1 : store Prisma/Postgres pour les sessions de
// check-in (remplace la Map() en mémoire). Les noms de méthodes et de
// champs restent identiques à l'ancienne version pour limiter les
// changements dans routes/checkin.routes.ts, staff.routes.ts, etc. —
// chaque méthode est maintenant async.
// ─────────────────────────────────────────────────────────────

export type CheckinStage = PrismaCheckinStage;

export interface CheckinSessionRecord {
  id: string;
  hotelId: string;
  hotelSlug: string;
  stage: CheckinStage;
  guestData?: GuestDataInput | null;
  children?: StayChildInput[] | null;
  signatureDataUrl?: string | null;
  paymentMethod?: PaymentMethodInput | null;
  room?: string | null;
  stayId?: string | null;
  pmsSynced: boolean;
  createdAt: Date | string;
  completedAt?: Date | string | null;
}

export const checkinStore = {
  async create(hotelId: string, hotelSlug: string): Promise<CheckinSessionRecord> {
    return prisma.checkinSession.create({
      data: { id: `cis_${nanoid(16)}`, hotelId, hotelSlug },
    }) as Promise<CheckinSessionRecord>;
  },

  async get(id: string): Promise<CheckinSessionRecord | undefined> {
    const rec = await prisma.checkinSession.findUnique({ where: { id } });
    return (rec as CheckinSessionRecord) ?? undefined;
  },

  async update(
    id: string,
    patch: Partial<CheckinSessionRecord>
  ): Promise<CheckinSessionRecord | undefined> {
    try {
      const rec = await prisma.checkinSession.update({
        where: { id },
        data: patch as Prisma.CheckinSessionUpdateInput,
      });
      return rec as CheckinSessionRecord;
    } catch {
      return undefined; // P2025 : session inexistante
    }
  },

  async completeAndIssueStay(
    id: string,
    room: string | undefined
  ): Promise<CheckinSessionRecord | undefined> {
    try {
      const rec = await prisma.checkinSession.update({
        where: { id },
        data: {
          stage: "completed",
          room,
          stayId: `stay_${nanoid(12)}`,
          completedAt: new Date(),
          pmsSynced: false, // en attente de reprise manuelle côté PMS
        },
      });
      return rec as CheckinSessionRecord;
    } catch {
      return undefined;
    }
  },

  async findByStayId(stayId: string): Promise<CheckinSessionRecord | undefined> {
    const rec = await prisma.checkinSession.findUnique({ where: { stayId } });
    return (rec as CheckinSessionRecord) ?? undefined;
  },

  async checkout(stayId: string): Promise<CheckinSessionRecord | undefined> {
    try {
      const rec = await prisma.checkinSession.update({
        where: { stayId },
        data: { stage: "checked_out" },
      });
      return rec as CheckinSessionRecord;
    } catch {
      return undefined;
    }
  },

  // Assigne/corrige le numéro de chambre d'un séjour déjà émis (stayId
  // existant) — utilisé par la reprise manuelle PMS depuis
  // ManualCheckInOut.jsx, PATCH /hotels/:hotelId/stays/:stayId/room.
  // Même convention que `checkout` : ciblage par `stayId`, pas par `id`.
  async updateRoom(stayId: string, room: string): Promise<CheckinSessionRecord | undefined> {
    try {
      const rec = await prisma.checkinSession.update({
        where: { stayId },
        data: { room },
      });
      return rec as CheckinSessionRecord;
    } catch {
      return undefined; // P2025 : séjour inexistant
    }
  },

  // "pending_pms_entry" — check-ins complétés côté client, pas encore
  // saisis/rapprochés dans l'ancien PMS.
  async listPendingPmsEntry(hotelId: string): Promise<CheckinSessionRecord[]> {
    return prisma.checkinSession.findMany({
      where: { hotelId, stage: "completed", pmsSynced: false },
    }) as Promise<CheckinSessionRecord[]>;
  },

  async markPmsSynced(id: string): Promise<CheckinSessionRecord | undefined> {
    try {
      const rec = await prisma.checkinSession.update({
        where: { id },
        data: { pmsSynced: true },
      });
      return rec as CheckinSessionRecord;
    } catch {
      return undefined;
    }
  },

  // Fiches police du jour : filtre sur la date d'arrivée renseignée par
  // le client, stockée dans le JSON guestData.
  async listByArrivalDate(hotelId: string, date: string): Promise<CheckinSessionRecord[]> {
    return prisma.checkinSession.findMany({
      where: {
        hotelId,
        stage: "completed",
        guestData: { path: ["arrival"], equals: date },
      },
    }) as Promise<CheckinSessionRecord[]>;
  },

  // Tous les séjours réels (en cours ou déjà check-outés) pour cet hôtel
  // — alimente le PMS staff avec les vraies données produites par l'app
  // client, au lieu des mocks locaux du frontend.
  async listActiveStays(hotelId: string): Promise<CheckinSessionRecord[]> {
    return prisma.checkinSession.findMany({
      where: { hotelId, stage: { in: ["completed", "checked_out"] } },
    }) as Promise<CheckinSessionRecord[]>;
  },
};
