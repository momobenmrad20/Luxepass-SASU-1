import { Router } from "express";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import { stayIdParamsSchema, postOrderSchema } from "../schemas";
import { ordersStore } from "../store/ordersStore";
import { pmsStateStore } from "../store/pmsStateStore";
import { resolveOrderItems } from "../services/catalogPricing";
import { requireActiveStayWithPayment } from "../utils/requireActiveStay";
import { publish } from "../events/hotelEventBus";
import { AppError } from "../utils/errors";

export const ordersRouter = Router();

// POST /stays/:stayId/orders
ordersRouter.post(
  "/stays/:stayId/orders",
  validate({ params: stayIdParamsSchema, body: postOrderSchema }),
  asyncHandler(async (req, res) => {
    const { stayId } = req.params;
    const session = await requireActiveStayWithPayment(stayId);

    // Le prix ne vient jamais du client : {id, qty} seulement, name/price
    // résolus ici depuis le catalogue serveur (même principe que
    // /payments/create-intent, cf. catalogPricing.ts).
    const catalog = await pmsStateStore.get(session.hotelId);
    let resolvedItems;
    try {
      resolvedItems = resolveOrderItems({
        category: req.body.category,
        items: req.body.items,
        catalog,
      });
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(err.statusCode).json({ error: err.code, message: err.message });
      }
      throw err;
    }

    const order = await ordersStore.create(
      stayId,
      session.hotelId,
      session.room ?? undefined,
      req.body.category,
      resolvedItems
    );

    publish(session.hotelId, { type: "order.created", data: order });

    res.status(201).json({
      orderId: order.id,
      status: order.status,
      total: order.total,
    });
  })
);

// GET /stays/:stayId/orders — inchangé
ordersRouter.get(
  "/stays/:stayId/orders",
  validate({ params: stayIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const { stayId } = req.params;
    await requireActiveStayWithPayment(stayId);

    const orders = await ordersStore.listByStay(stayId);
    res.json({
      orders: orders.map((o) => ({
        orderId: o.id,
        category: o.category,
        items: o.items,
        total: o.total,
        status: o.status,
        paidOnline: Boolean(o.paymentId),
        createdAt: o.createdAt,
      })),
      folioTotal: orders.reduce((sum, o) => sum + o.total, 0),
      paidOnlineTotal: orders.filter((o) => o.paymentId).reduce((sum, o) => sum + o.total, 0),
      balanceDue: orders.filter((o) => !o.paymentId).reduce((sum, o) => sum + o.total, 0),
    });
  })
);
