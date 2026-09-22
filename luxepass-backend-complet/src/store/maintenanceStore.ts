import { nanoid } from "nanoid";
import { prisma } from "../prisma";
import type { PostMaintenanceReportInput } from "../schemas";

// ─────────────────────────────────────────────────────────────
// MIGRATION PHASE 1 : store Prisma/Postgres pour les signalements
// maintenance remontés par le client. Mêmes noms de méthodes — async.
// ─────────────────────────────────────────────────────────────

export interface MaintenanceRecord {
  id: string;
  stayId: string;
  hotelId: string;
  room?: string | null;
  issue: string;
  equipment?: string | null;
  priority: "HIGH"; // les signalements client sont toujours traités en priorité haute
  status: "pending" | "in_progress" | "done";
  ticket: string;
  createdAt: Date | string;
}

export const maintenanceStore = {
  async create(
    stayId: string,
    hotelId: string,
    room: string | undefined,
    input: PostMaintenanceReportInput
  ): Promise<MaintenanceRecord> {
    return prisma.maintenanceReport.create({
      data: {
        id: `mnt_${nanoid(14)}`,
        stayId,
        hotelId,
        room,
        issue: input.issue,
        equipment: input.equipment,
        priority: "HIGH",
        ticket: `INC-${Date.now().toString().slice(-6)}`,
      },
    }) as Promise<MaintenanceRecord>;
  },

  async listByStay(stayId: string): Promise<MaintenanceRecord[]> {
    return prisma.maintenanceReport.findMany({
      where: { stayId },
      orderBy: { createdAt: "desc" },
    }) as Promise<MaintenanceRecord[]>;
  },

  async listByHotel(hotelId: string): Promise<MaintenanceRecord[]> {
    return prisma.maintenanceReport.findMany({ where: { hotelId } }) as Promise<MaintenanceRecord[]>;
  },

  async updateStatus(
    id: string,
    status: MaintenanceRecord["status"]
  ): Promise<MaintenanceRecord | undefined> {
    try {
      return (await prisma.maintenanceReport.update({ where: { id }, data: { status } })) as MaintenanceRecord;
    } catch {
      return undefined;
    }
  },
};
