import { nanoid } from "nanoid";
import { prisma } from "../prisma";
import type { PostServiceRequestInput } from "../schemas";

// ─────────────────────────────────────────────────────────────
// MIGRATION PHASE 1 : store Prisma/Postgres pour les demandes de
// service (room service côté client, tickets créés par le concierge
// IA...). Mêmes noms de méthodes que l'ancienne version — async.
// ─────────────────────────────────────────────────────────────

export interface ServiceRequestRecord {
  id: string;
  stayId: string;
  hotelId: string;
  room?: string | null;
  req: string;
  priority: PostServiceRequestInput["priority"];
  price: number;
  status: "pending" | "in_progress" | "done";
  createdAt: Date | string;
  sentiment?: "positive" | "neutral" | "negative" | "urgent" | null;
}

export const serviceRequestsStore = {
  async create(
    stayId: string,
    hotelId: string,
    room: string | undefined,
    input: PostServiceRequestInput,
    sentiment?: ServiceRequestRecord["sentiment"]
  ): Promise<ServiceRequestRecord> {
    return prisma.serviceRequest.create({
      data: {
        id: `sr_${nanoid(14)}`,
        stayId,
        hotelId,
        room,
        req: input.req,
        priority: input.priority,
        price: input.price,
        sentiment: sentiment ?? undefined,
      },
    }) as Promise<ServiceRequestRecord>;
  },

  async listByStay(stayId: string): Promise<ServiceRequestRecord[]> {
    return prisma.serviceRequest.findMany({
      where: { stayId },
      orderBy: { createdAt: "desc" },
    }) as Promise<ServiceRequestRecord[]>;
  },

  async listByHotel(hotelId: string): Promise<ServiceRequestRecord[]> {
    return prisma.serviceRequest.findMany({ where: { hotelId } }) as Promise<ServiceRequestRecord[]>;
  },

  async updateStatus(
    id: string,
    status: ServiceRequestRecord["status"]
  ): Promise<ServiceRequestRecord | undefined> {
    try {
      return (await prisma.serviceRequest.update({ where: { id }, data: { status } })) as ServiceRequestRecord;
    } catch {
      return undefined;
    }
  },
};
