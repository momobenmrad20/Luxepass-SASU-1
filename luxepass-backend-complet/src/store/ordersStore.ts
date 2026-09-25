import { nanoid } from "nanoid";
import { prisma } from "../prisma";
import type { PostOrderInput } from "../schemas";
import type { ResolvedOrderLine } from "../services/catalogPricing";

// ─────────────────────────────────────────────────────────────
// MIGRATION PHASE 1 : store Prisma/Postgres pour les commandes passées
// après le check-in (room service, spa...). Mêmes noms de méthodes que
// l'ancienne version in-memory — désormais async.
//
// `items` stocké est désormais toujours résolu côté serveur
// (ResolvedOrderLine : id, name, price, qty) — jamais les {id, qty} bruts
// envoyés par le client, cf. orders.routes.ts / catalogPricing.ts.
// ─────────────────────────────────────────────────────────────

export interface OrderRecord {
  id: string;
  stayId: string;
  hotelId: string;
  room?: string | null;
  category: PostOrderInput["category"];
  items: ResolvedOrderLine[];
  total: number;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  // Non null = commande déjà RÉGLÉE EN LIGNE (cf. services/paymentService.ts) :
  // à exclure de ce qui reste à facturer sur la carte du séjour.
  paymentId?: string | null;
  createdAt: Date | string;
}

export const ordersStore = {
  async create(
    stayId: string,
    hotelId: string,
    room: string | undefined,
    category: PostOrderInput["category"],
    items: ResolvedOrderLine[]
  ): Promise<OrderRecord> {
    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    return prisma.order.create({
      data: { id: `ord_${nanoid(14)}`, stayId, hotelId, room, category, items, total },
    }) as unknown as Promise<OrderRecord>;
  },

  async listByStay(stayId: string): Promise<OrderRecord[]> {
    return prisma.order.findMany({
      where: { stayId },
      orderBy: { createdAt: "desc" }, // plus récent en premier
    }) as Promise<OrderRecord[]>;
  },

  async listByHotel(hotelId: string): Promise<OrderRecord[]> {
    return prisma.order.findMany({ where: { hotelId } }) as Promise<OrderRecord[]>;
  },

  async updateStatus(id: string, status: OrderRecord["status"]): Promise<OrderRecord | undefined> {
    try {
      return (await prisma.order.update({ where: { id }, data: { status } })) as OrderRecord;
    } catch {
      return undefined;
    }
  },
};
