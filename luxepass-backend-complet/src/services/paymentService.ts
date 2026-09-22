import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import Stripe from "stripe";
import { Prisma, PaymentStatus } from "@prisma/client";
import type { Payment } from "@prisma/client";
import { config } from "../config";
import { prisma } from "../prisma";
import { publish } from "../events/hotelEventBus";
import { pmsStateStore } from "../store/pmsStateStore";
import type { OrderRecord } from "../store/ordersStore";
import { requireOpenStay } from "../utils/requireActiveStay";
import { AppError, ConflictError, NotFoundError } from "../utils/errors";
import { fromMinorUnits, isValidMinorAmount, toMinorUnits } from "../utils/money";
import {
  priceOrderItems,
  type CatalogEntry,
  type CatalogSnapshot,
  type PayableCategory,
  type PricedLine,
} from "./catalogPricing";

// ═════════════════════════════════════════════════════════════
// Paiement en ligne — Stripe PaymentIntents + webhook signé.
//
// PÉRIMÈTRE PCI-DSS : aucune donnée de carte ne traverse ce backend. Le
// navigateur envoie le PAN/CVV directement à Stripe (Stripe Elements, iframes
// hébergées par Stripe) ; ici on ne manipule que :
//   - un `client_secret` (renvoyé au navigateur pour confirmer le paiement),
//   - l'identifiant du PaymentIntent (pi_…),
//   - la marque et les 4 derniers chiffres, renvoyés par Stripe après coup.
//
// FLUX
//   1. POST /payments/create-intent  → prix recalculés CÔTÉ SERVEUR, ligne
//      Payment PENDING, PaymentIntent créé, `clientSecret` renvoyé.
//   2. Le navigateur confirme avec Stripe.js (stripe.confirmPayment).
//   3. Stripe appelle POST /payments/webhook (signature vérifiée) :
//        payment_intent.succeeded      → Payment PAID + Order créée (même
//                                        transaction SQL) + `order.created`
//                                        publié sur le live-feed de l'hôtel
//        payment_intent.payment_failed → Payment FAILED (échec enregistré)
//      Seul le webhook fait foi : le retour de confirmPayment côté navigateur
//      ne prouve rien (il peut être forgé ou interrompu).
// ═════════════════════════════════════════════════════════════

// ── Client Stripe (singleton paresseux) ──────────────────────
// Pas d'`apiVersion` explicite : le SDK utilise celle contre laquelle il a été
// compilé — épinglez donc la version du paquet `stripe` (package-lock) pour
// ne pas changer d'API sans le vouloir.
let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!config.payments.stripe.enabled) {
    throw new AppError(503, "payments_disabled", "Le paiement en ligne n'est pas configuré");
  }
  stripeClient ??= new Stripe(config.payments.stripe.secretKey, {
    maxNetworkRetries: 2, // Stripe réutilise la clé d'idempotence : aucun risque de double création
    timeout: 15_000,
    appInfo: { name: "LuxePass" },
  });
  return stripeClient;
}

// Détail loggé côté serveur uniquement : un message Stripe peut citer des
// paramètres internes, on ne le renvoie jamais au client.
function toProviderError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  const e = err as Partial<Stripe.errors.StripeError>;
  // eslint-disable-next-line no-console
  console.error("[payments] erreur PSP:", {
    type: e?.type,
    code: e?.code,
    requestId: e?.requestId,
    message: e?.message,
  });
  return new AppError(502, "payment_provider_error", "Service de paiement momentanément indisponible");
}

// ── Catalogue ────────────────────────────────────────────────
function catalogArray(value: unknown): CatalogEntry[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter(
    (e): e is CatalogEntry =>
      !!e &&
      typeof e.id === "string" &&
      typeof e.name === "string" &&
      typeof e.price === "number" &&
      Number.isFinite(e.price)
  );
}

async function loadCatalog(hotelId: string): Promise<CatalogSnapshot> {
  const state = await pmsStateStore.get(hotelId);
  return { menu: catalogArray(state.menu), services: catalogArray(state.services) };
}

// ═════════════════════════════════════════════════════════════
// 1. Création de l'intention de paiement
// ═════════════════════════════════════════════════════════════

export interface CreatePaymentIntentParams {
  stayId: string;
  category: PayableCategory;
  items: ReadonlyArray<{ id: string; qty: number }>;
  /** Total affiché au client (unités principales) — simple contrôle de cohérence. */
  expectedAmount: number;
  currency: string;
  /** En-tête `Idempotency-Key` (optionnel) : rend l'appel rejouable sans doublon. */
  idempotencyKey?: string;
}

export interface CreatePaymentIntentResult {
  paymentId: string;
  clientSecret: string;
  /** Total réellement débité, calculé par le serveur (unités principales). */
  total: number;
  currency: string;
}

export async function createPaymentIntent(
  params: CreatePaymentIntentParams
): Promise<CreatePaymentIntentResult> {
  const { stayId, category, items, expectedAmount, idempotencyKey } = params;

  // Séjour existant ET non clôturé (comme les autres routes d'écriture).
  const session = await requireOpenStay(stayId);

  // La devise est celle de l'établissement, pas celle que le client annonce.
  const currency = config.payments.currency;
  if (params.currency !== currency) {
    throw new AppError(422, "unsupported_currency", `Devise non supportée (attendu : ${currency})`);
  }

  // Le montant est recalculé ICI, à partir du catalogue serveur.
  const catalog = await loadCatalog(session.hotelId);
  const { lines, total } = priceOrderItems({ category, items, catalog, currency });
  if (!isValidMinorAmount(total, currency)) {
    throw new AppError(422, "invalid_amount", "Montant de commande invalide");
  }

  // Le client doit payer ce qu'il a vu : si les prix ont bougé entre
  // l'affichage et le paiement, on refuse plutôt que de débiter un autre montant.
  if (toMinorUnits(expectedAmount, currency) !== total) {
    throw new AppError(409, "price_mismatch", "Les prix ont changé, veuillez actualiser votre commande", {
      serverTotal: fromMinorUnits(total, currency),
      currency,
    });
  }

  // Id déterministe si l'appelant fournit une Idempotency-Key : deux appels
  // identiques (double-clic, reprise réseau) retombent sur la même ligne, et
  // Stripe reçoit la même clé d'idempotence.
  const paymentId = idempotencyKey
    ? `pay_${createHash("sha256").update(`${stayId}:${idempotencyKey}`).digest("hex").slice(0, 24)}`
    : `pay_${nanoid(16)}`;

  const existing = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (existing) return replayExisting(existing, { amount: total, category });

  let intent: Stripe.PaymentIntent;
  try {
    intent = await getStripe().paymentIntents.create(
      {
        amount: total,
        currency,
        // Cartes + wallets (Apple Pay / Google Pay) sans redirection : pas de return_url à gérer.
        automatic_payment_methods: { enabled: true, allow_redirects: "never" },
        // Métadonnées : uniquement des identifiants opaques, aucune donnée personnelle.
        metadata: { stayId, hotelId: session.hotelId, paymentId },
      },
      { idempotencyKey: paymentId }
    );
  } catch (err) {
    throw toProviderError(err);
  }

  if (!intent.client_secret) {
    throw new AppError(502, "payment_provider_error", "Service de paiement momentanément indisponible");
  }

  try {
    await prisma.payment.create({
      data: {
        id: paymentId,
        stayId,
        hotelId: session.hotelId,
        providerTransactionId: intent.id,
        status: PaymentStatus.PENDING,
        category,
        items: lines as unknown as Prisma.InputJsonValue,
        amount: total,
        currency,
      },
    });
  } catch (err) {
    // Course entre deux requêtes identiques (même Idempotency-Key) : l'autre a gagné.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const raced = await prisma.payment.findUnique({ where: { id: paymentId } });
      if (raced) return replayExisting(raced, { amount: total, category });
    }
    throw err;
  }

  return {
    paymentId,
    clientSecret: intent.client_secret,
    total: fromMinorUnits(total, currency),
    currency,
  };
}

// Rejeu d'un appel déjà traité : on renvoie le MÊME PaymentIntent, sans en créer un second.
async function replayExisting(
  existing: Payment,
  expected: { amount: number; category: string }
): Promise<CreatePaymentIntentResult> {
  if (existing.amount !== expected.amount || existing.category !== expected.category) {
    throw new ConflictError("Cette Idempotency-Key a déjà servi pour une commande différente");
  }
  if (existing.status === PaymentStatus.PAID) {
    throw new ConflictError("Cette commande est déjà réglée");
  }
  let intent: Stripe.PaymentIntent;
  try {
    intent = await getStripe().paymentIntents.retrieve(existing.providerTransactionId);
  } catch (err) {
    throw toProviderError(err);
  }
  if (!intent.client_secret || intent.status === "succeeded" || intent.status === "canceled") {
    throw new ConflictError("Ce paiement n'est plus modifiable, relancez la commande");
  }
  return {
    paymentId: existing.id,
    clientSecret: intent.client_secret,
    total: fromMinorUnits(existing.amount, existing.currency),
    currency: existing.currency,
  };
}

// ── Lecture du statut (le navigateur interroge après confirmPayment) ──
export async function getPaymentForStay(stayId: string, paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: { select: { id: true } } },
  });
  // Même 404 pour « inexistant » et « d'un autre séjour » : pas d'oracle d'existence.
  if (!payment || payment.stayId !== stayId) throw new NotFoundError("Paiement");
  return {
    paymentId: payment.id,
    status: payment.status,
    total: fromMinorUnits(payment.amount, payment.currency),
    currency: payment.currency,
    orderId: payment.order?.id ?? null,
  };
}

// ═════════════════════════════════════════════════════════════
// 2. Webhook Stripe
// ═════════════════════════════════════════════════════════════

/**
 * Vérifie la signature HMAC (en-tête `Stripe-Signature`) sur le corps BRUT
 * (Buffer, non re-sérialisé) et la fraîcheur du timestamp (5 min par défaut,
 * anti-rejeu). Lève si la signature est invalide.
 */
export function constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
  return getStripe().webhooks.constructEvent(rawBody, signature, config.payments.stripe.webhookSecret);
}

/**
 * Aiguille un événement DÉJÀ authentifié. Lève en cas d'erreur transitoire
 * (base indisponible…) → la route répond 500 et Stripe rejoue avec backoff.
 * Idempotent : Stripe livre « au moins une fois » et sans garantie d'ordre.
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "payment_intent.succeeded":
      return onPaymentSucceeded(event.data.object as Stripe.PaymentIntent);
    case "payment_intent.payment_failed":
      return onPaymentFailed(event.data.object as Stripe.PaymentIntent);
    default:
      return; // événement non géré : accusé de réception (200) sans traitement
  }
}

async function onPaymentSucceeded(pi: Stripe.PaymentIntent): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { providerTransactionId: pi.id } });
  if (!payment) {
    // Pas un de nos paiements (autre produit sur le même compte Stripe, événement
    // de test…) : inutile de faire rejouer, on acquitte.
    // eslint-disable-next-line no-console
    console.warn("[payments] PaymentIntent inconnu, ignoré:", pi.id);
    return;
  }

  // Défense en profondeur : le montant d'un PaymentIntent ne peut être modifié
  // que par nous (clé secrète), donc ceci ne devrait jamais se déclencher. Si
  // c'est le cas, on NE crée PAS la commande et on alerte pour traitement manuel.
  if (payment.amount !== pi.amount_received || payment.currency !== pi.currency) {
    // eslint-disable-next-line no-console
    console.error("[payments] ⚠️ montant/devise incohérents — commande NON créée, à vérifier à la main", {
      paymentId: payment.id,
      paymentIntent: pi.id,
      expected: { amount: payment.amount, currency: payment.currency },
      received: { amount: pi.amount_received, currency: pi.currency },
    });
    return;
  }

  const method = await fetchPaymentMethodDetails(pi.id);

  // PENDING/FAILED → PAID et création de la commande dans UNE transaction :
  // jamais de paiement « PAID » sans commande, jamais deux commandes pour un
  // même paiement (updateMany conditionnel = verrou de ligne ; une livraison
  // concurrente ou rejouée trouve déjà PAID → count 0 → rien à faire).
  const created = await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: PaymentStatus.PAID } },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        failureCode: null,
        failureMessage: null,
        ...method,
      },
    });
    if (claimed.count === 0) return null;

    const stay = await tx.checkinSession.findUnique({
      where: { stayId: payment.stayId },
      select: { room: true },
    });
    const lines = payment.items as unknown as PricedLine[];
    const order = await tx.order.create({
      data: {
        id: `ord_${nanoid(14)}`,
        stayId: payment.stayId,
        hotelId: payment.hotelId,
        room: stay?.room ?? null,
        category: payment.category,
        // Même forme que les commandes historiques : prix en unités principales.
        items: lines.map((l) => ({
          id: l.id,
          name: l.name,
          price: fromMinorUnits(l.unitAmount, payment.currency),
          qty: l.qty,
        })),
        total: fromMinorUnits(payment.amount, payment.currency),
        paymentId: payment.id,
      },
    });
    return order;
  });

  if (!created) return; // déjà traité : on ne re-notifie pas la réception

  // Après COMMIT seulement : ne jamais annoncer une commande qui pourrait être annulée.
  // (Le bus est en mémoire, sans rejeu : si le process tombe ici, la réception verra
  // quand même la commande au prochain snapshot du live-feed — cf. hotelEventBus.ts.)
  publish(payment.hotelId, { type: "order.created", data: created as unknown as OrderRecord });
  // eslint-disable-next-line no-console
  console.info("[payments] paiement encaissé", { paymentId: payment.id, orderId: created.id });
}

async function onPaymentFailed(pi: Stripe.PaymentIntent): Promise<void> {
  const err = pi.last_payment_error;
  const failureMessage = err?.message?.slice(0, 300) ?? null;
  // Un échec n'est pas terminal (le client peut retenter sur le même PaymentIntent),
  // mais un paiement déjà PAID ne redevient jamais FAILED (événements dans le désordre).
  const updated = await prisma.payment.updateMany({
    where: {
      providerTransactionId: pi.id,
      status: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
    },
    data: {
      status: PaymentStatus.FAILED,
      failureCode: err?.decline_code ?? err?.code ?? null,
      failureMessage,
      paymentMethodType: err?.payment_method?.type ?? null,
    },
  });
  // count === 0 : déjà PAID (événement désordonné/rejoué) — ne pas notifier
  // un échec sur un paiement en réalité encaissé.
  if (updated.count === 0) return;

  const payment = await prisma.payment.findUnique({ where: { providerTransactionId: pi.id } });
  if (!payment) return; // pas un de nos paiements, cf. onPaymentSucceeded

  // eslint-disable-next-line no-console
  console.warn("[payments] paiement échoué", { paymentId: payment.id, code: err?.code, message: failureMessage });
  publish(payment.hotelId, {
    type: "payment.failed",
    data: {
      stayId: payment.stayId,
      paymentId: payment.id,
      category: payment.category,
      amount: payment.amount,
      currency: payment.currency,
      failureMessage,
    },
  });
}

// Marque / 4 derniers chiffres / type (card, apple_pay…) — lus sur la Charge.
// Non bloquant : si Stripe ne répond pas, le paiement est quand même acté.
async function fetchPaymentMethodDetails(paymentIntentId: string) {
  const empty = { paymentMethodType: null, cardBrand: null, cardLast4: null };
  try {
    const full = await getStripe().paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });
    const charge = typeof full.latest_charge === "object" ? full.latest_charge : null;
    const d = charge?.payment_method_details;
    return {
      paymentMethodType: d?.card?.wallet?.type ?? d?.type ?? null,
      cardBrand: d?.card?.brand ?? null,
      cardLast4: d?.card?.last4 ?? null,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[payments] détails du moyen de paiement indisponibles:", (err as Error).message);
    return empty;
  }
}
