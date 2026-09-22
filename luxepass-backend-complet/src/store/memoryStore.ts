import { nanoid } from "nanoid";
import { StaffRole } from "@prisma/client";
import { prisma } from "../prisma";

// ─────────────────────────────────────────────────────────────
// MIGRATION PHASE 1 : ce fichier s'appelait "memoryStore.ts" quand les
// données vivaient en Map() dans le process. Il garde son nom et les
// mêmes noms d'exports (hotelStore, staffStore) pour ne pas casser les
// imports ailleurs dans le code — mais chaque fonction est maintenant
// async et passe par Prisma/Postgres.
//
// Le seed de démo (hôtel Oceana + comptes staff) ne vit plus ici : voir
// prisma/seed.ts, lancé via `npm run db:seed`.
// ─────────────────────────────────────────────────────────────

export interface HotelRecord {
  id: string;
  slug: string;
  name: string;
}

export interface StaffRecord {
  id: string;
  email: string;
  passwordHash: string;
  hotelId: string;
  role: StaffRole;
  name?: string | null;
  tokenVersion: number;
}

export const hotelStore = {
  async findBySlug(slug: string): Promise<HotelRecord | undefined> {
    const hotel = await prisma.hotel.findUnique({ where: { slug } });
    return hotel ?? undefined;
  },
  async findById(id: string): Promise<HotelRecord | undefined> {
    const hotel = await prisma.hotel.findUnique({ where: { id } });
    return hotel ?? undefined;
  },
};

export const staffStore = {
  async findByEmail(email: string): Promise<StaffRecord | undefined> {
    const staff = await prisma.staff.findUnique({ where: { email } });
    return staff ?? undefined;
  },
  async findById(id: string): Promise<StaffRecord | undefined> {
    const staff = await prisma.staff.findUnique({ where: { id } });
    return staff ?? undefined;
  },
  async updatePasswordHash(id: string, newHash: string): Promise<void> {
    // tokenVersion incrémenté atomiquement : invalide tous les anciens
    // refresh tokens d'un coup (cf. auth.routes.ts).
    await prisma.staff.update({
      where: { id },
      data: { passwordHash: newHash, tokenVersion: { increment: 1 } },
    });
  },
  async create(input: Omit<StaffRecord, "id" | "tokenVersion">): Promise<StaffRecord> {
    return prisma.staff.create({
      data: { ...input, id: `staff_${nanoid(10)}`, tokenVersion: 0 },
    });
  },
  async listByHotel(hotelId: string): Promise<StaffRecord[]> {
    return prisma.staff.findMany({ where: { hotelId } });
  },
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.staff.delete({ where: { id } });
      return true;
    } catch {
      // P2025 (Prisma) = enregistrement déjà absent — on renvoie false
      // comme le faisait l'ancienne version in-memory, plutôt que de
      // laisser remonter une erreur générique.
      return false;
    }
  },
};
