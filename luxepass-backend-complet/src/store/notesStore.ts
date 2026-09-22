import { nanoid } from "nanoid";
import { prisma } from "../prisma";

// ─────────────────────────────────────────────────────────────
// MIGRATION PHASE 1 : store Prisma/Postgres pour les notes concierge
// (mémoire des préférences client). Mêmes noms de méthodes — async.
// ─────────────────────────────────────────────────────────────

export interface NoteRecord {
  id: string;
  stayId: string;
  hotelId: string;
  room?: string | null;
  text: string;
  createdAt: Date | string;
}

export const notesStore = {
  async add(
    stayId: string,
    hotelId: string,
    room: string | undefined,
    text: string
  ): Promise<NoteRecord> {
    return prisma.note.create({
      data: { id: `note_${nanoid(14)}`, stayId, hotelId, room, text },
    }) as Promise<NoteRecord>;
  },

  async listByStay(stayId: string): Promise<NoteRecord[]> {
    return prisma.note.findMany({
      where: { stayId },
      orderBy: { createdAt: "asc" }, // le plus ancien en premier
    }) as Promise<NoteRecord[]>;
  },

  async listByHotel(hotelId: string): Promise<NoteRecord[]> {
    return prisma.note.findMany({ where: { hotelId } }) as Promise<NoteRecord[]>;
  },

  // Bouton "effacer mes données" côté client (droit à l'effacement RGPD,
  // limité ici aux notes concierge — voir prisma/README-RETENTION.md pour
  // le périmètre complet à couvrir en production).
  async clearByStay(stayId: string): Promise<void> {
    await prisma.note.deleteMany({ where: { stayId } });
  },
};
