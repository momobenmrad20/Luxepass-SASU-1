import express, { Request, Router } from "express";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireStayAuthFromBody } from "../middleware/requireStayAuthFromBody";
import { paymentIntentIpLimiter, paymentIntentStayLimiter } from "../middleware/publicRateLimit";
import { createPaymentIntentSchema, stayPaymentParamsSchema } from "../schemas";
import {
  constructWebhookEvent,
  createPaymentIntent,
  getPaymentForStay,
  handleWebhookEvent,
} from "../services/paymentService";
import { config } from "../config";
import { AppError, ForbiddenError, ValidationError } from "../utils/errors";

// ═════════════════════════════════════════════════════════════
// Routes de paiement en ligne. DEUX routers, montés à des endroits différents
// d'index.ts (l'ordre est CRITIQUE) :
//
//  - paymentsWebhookRouter : monté AVANT express.json(). La signature Stripe
//    est calculée sur les octets exacts reçus ; si le corps est déjà parsé puis
//    re-sérialisé, elle ne correspond plus. Ce router utilise donc son propre
//    express.raw() et reçoit un Buffer.
//  - paymentsRouter : monté APRÈS le garde `app.use("/stays/:stayId",
//    requireStayAuth)` (la route GET de statut en hérite).
// ═════════════════════════════════════════════════════════════

// ── Webhook Stripe ───────────────────────────────────────────
// POST /payments/webhook   (appelé par Stripe, pas par le navigateur)
export const paymentsWebhookRouter = Router();

paymentsWebhookRouter.post(
  "/payments/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  asyncHandler(async (req, res) => {
    if (!config.payments.stripe.enabled) {
      throw new AppError(503, "payments_disabled", "Le paiement en ligne n'est pas configuré");
    }

    const signature = req.header("stripe-signature");
    if (!signature || !Buffer.isBuffer(req.body)) {
      return res.status(400).json({ error: "invalid_webhook", message: "Requête webhook invalide" });
    }

    // Authentification : SEULE la signature prouve que l'appel vient de Stripe.
    // Rien n'est lu dans le corps avant que ceci ne réussisse.
    let event;
    try {
      event = constructWebhookEvent(req.body, signature);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[payments/webhook] signature refusée:", (err as Error).message);
      return res.status(400).json({ error: "invalid_signature", message: "Signature invalide" });
    }

    // Une erreur ici (base injoignable…) remonte à errorHandler → 500 → Stripe rejoue.
    await handleWebhookEvent(event);
    res.status(200).json({ received: true });
  })
);

// ── Routes client ────────────────────────────────────────────
export const paymentsRouter = Router();

// L'en-tête `Idempotency-Key` (optionnel) doit être opaque et raisonnablement long.
function readIdempotencyKey(req: Request): string | undefined {
  const raw = req.header("idempotency-key");
  if (raw === undefined) return undefined;
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(raw)) {
    throw new ValidationError([
      { source: "headers", path: ["Idempotency-Key"], message: "16 à 80 caractères [A-Za-z0-9_-] attendus" },
    ]);
  }
  return raw;
}

// POST /payments/create-intent
// Ordre : limiteur IP → validation → authentification du séjour → limiteur par séjour.
paymentsRouter.post(
  "/payments/create-intent",
  paymentIntentIpLimiter,
  validate({ body: createPaymentIntentSchema }),
  requireStayAuthFromBody,
  paymentIntentStayLimiter,
  asyncHandler(async (req, res) => {
    // Seul le CLIENT du séjour (stayToken) déclenche un paiement ; le repli staff
    // de requireStayAuth authentifie mais n'a pas de `staySession`.
    if (!req.staySession) throw new ForbiddenError("Réservé au client du séjour");

    const { stayId, category, items, amount, currency } = req.body;
    const result = await createPaymentIntent({
      stayId,
      category,
      items,
      expectedAmount: amount,
      currency,
      idempotencyKey: readIdempotencyKey(req),
    });

    // Contient un client_secret : ne doit jamais être mis en cache.
    res.set("Cache-Control", "no-store");
    // On renvoie le strict nécessaire : clientSecret + le montant que le SERVEUR va débiter.
    res.status(201).json(result);
  })
);

// GET /stays/:stayId/payments/:paymentId — statut après confirmPayment.
// Le navigateur interroge cette route (le webhook est asynchrone) jusqu'à
// PAID / FAILED. Protégée par le garde global /stays/:stayId ; le contrôle
// `payment.stayId === stayId` est fait dans le service.
paymentsRouter.get(
  "/stays/:stayId/payments/:paymentId",
  validate({ params: stayPaymentParamsSchema }),
  asyncHandler(async (req, res) => {
    const { stayId, paymentId } = req.params;
    res.set("Cache-Control", "no-store");
    res.json(await getPaymentForStay(stayId, paymentId));
  })
);
