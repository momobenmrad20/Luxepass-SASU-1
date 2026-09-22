import { Router } from "express";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import { stayIdParamsSchema, postOrderSchema } from "../schemas";
import { ordersStore } from "../store/ordersStore";
import { requireActiveStayWithPayment } from "../utils/requireActiveStay";
import { publish } from "../events/hotelEventBus";

// Toutes les routes /stays/:stayId/* de ce fichier sont protégées par
// requireStayAuth (stayToken client, ou JWT staff reception/gm/super_admin),
// monté une fois sur `/stays/:stayId` dans index.ts AVANT ce router — voir
// middleware/requireStayAuth.ts.
export const ordersRouter = Router();

// POST /stays/:stayId/orders
ordersRouter.post(
  "/stays/:stayId/orders",
  validate({ params: stayIdParamsSchema, body: postOrderSchema }),
  asyncHandler(async (req, res) => {
    const { stayId } = req.params;
    const session = await requireActiveStayWithPayment(stayId);

    const order = await ordersStore.create(
      stayId,
      session.hotelId,
      session.room ?? undefined,
      req.body.category,
      req.body.items
    );

    publish(session.hotelId, { type: "order.created", data: order });

    res.status(201).json({
      orderId: order.id,
      status: order.status,
      total: order.total,
    });
  })
);

// GET /stays/:stayId/orders — historique des commandes du séjour (folio)
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
        // true = déjà réglée en ligne (PaymentIntent) : ne sera pas refacturée au checkout.
        paidOnline: Boolean(o.paymentId),
        createdAt: o.createdAt,
      })),
      // folioTotal = consommation TOTALE du séjour (inchangé). Les commandes déjà
      // payées en ligne en font partie mais ne sont plus dues : c'est balanceDue
      // qui reste à facturer sur la carte du séjour.
      folioTotal: orders.reduce((sum, o) => sum + o.total, 0),
      paidOnlineTotal: orders.filter((o) => o.paymentId).reduce((sum, o) => sum + o.total, 0),
      balanceDue: orders.filter((o) => !o.paymentId).reduce((sum, o) => sum + o.total, 0),
    });
  })
);
