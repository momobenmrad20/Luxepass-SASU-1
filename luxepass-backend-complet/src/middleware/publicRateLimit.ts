import type { Request } from "express";
import rateLimit from "express-rate-limit";

// ─────────────────────────────────────────────────────────────
// Rate limiting des routes publiques (README §12, P0/P1). Seul
// /auth/login était protégé ; les routes ci-dessous n'ont pas de compte
// derrière elles, donc pas d'autre garde-fou :
//   - création de sessions de check-in (spam de lignes en base)
//   - messages au concierge IA (coût direct de l'API Anthropic)
//   - catalogue de services (public, rafraîchi en continu par le front)
//   - qr-verify (public, appelé par le back-office)
//
// ⚠️ NAT HÔTELIER : les clients d'un hôtel sortent presque tous par UNE
// seule IP publique (wifi de l'hôtel). Un plafond « par IP » trop bas
// bloquerait des clients légitimes qui n'ont rien en commun. Les plafonds
// par IP ci-dessous sont donc larges (ils coupent l'abus grossier) ; la
// vraie protection du coût Anthropic est le plafond PAR SÉJOUR
// (conciergeStayLimiter / conciergeStayDailyLimiter).
//
// ⚠️ Compteurs en MÉMOIRE (store par défaut) : remis à zéro au redémarrage,
// non partagés entre instances. Avec plusieurs instances, brancher un store
// Redis (rate-limit-redis), comme pour le bus SSE (README §8).
//
// ⚠️ Derrière un reverse proxy, req.ip est l'IP du proxy tant que
// `trust proxy` n'est pas configuré : voir TRUST_PROXY_HOPS (config.ts).
// ─────────────────────────────────────────────────────────────

function rateLimitedResponse(message: string) {
  return { error: "too_many_requests", message, details: [] };
}

// Clé « par séjour » : tronquée pour qu'un stayId absurde (paramètre non
// validé à ce stade) ne gonfle pas la mémoire du store.
const stayKey = (req: Request) => `stay:${String(req.params.stayId).slice(0, 64)}`;

// Démarrage d'un check-in : chaque appel crée une ligne en base. Un client
// légitime en ouvre une poignée (reprises après coupure réseau incluses),
// mais tout un hôtel partage l'IP : 60 / 15 min / IP.
export const checkinCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitedResponse(
    "Trop de tentatives de check-in depuis cette adresse. Réessayez dans quelques minutes."
  ),
});

// Concierge IA — 1re couche, par IP (large : NAT hôtelier).
export const conciergeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitedResponse(
    "Trop de messages envoyés depuis cette connexion. Réessayez dans une minute."
  ),
});

// Concierge IA — 2e couche, PAR SÉJOUR : un échange normal tient largement
// dans 8 messages / minute. À placer APRÈS la validation des params.
export const conciergeStayLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 8,
  keyGenerator: stayKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitedResponse(
    "Vous écrivez trop vite. Patientez quelques secondes avant le prochain message."
  ),
});

// Concierge IA — 3e couche, plafond quotidien par séjour (coût borné).
export const conciergeStayDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 300,
  keyGenerator: stayKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitedResponse(
    "Limite quotidienne de messages atteinte pour ce séjour. Contactez la réception."
  ),
});

// Catalogue de services : le front le rafraîchit toutes les 15 s par
// onglet ouvert (≈ 4 requêtes/min/client), d'où 300 / min / IP (~75 clients
// derrière la même IP). Le coût de la traduction IA (lang ≠ fr) est déjà
// borné par le cache de 8 s de pms.routes.ts (une clé par hôtel et par
// langue) : pas de limiteur dédié.
export const catalogueLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitedResponse("Trop de requêtes. Réessayez dans une minute."),
});

// GET /stays/:stayId/qr-verify — public, appelé par la réception.
export const qrVerifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitedResponse("Trop de vérifications de pass. Réessayez dans une minute."),
});

// ─────────────────────────────────────────────────────────────
// Paiement en ligne — POST /payments/create-intent.
// Chaque appel crée un PaymentIntent chez Stripe : coût, pollution du
// dashboard, et surtout porte d'entrée du « card testing » (un fraudeur
// qui teste des numéros volés). Deux couches, comme le concierge IA :
//   1. par IP (large : NAT hôtelier) — coupe l'abus grossier avant toute
//      vérification de token ;
//   2. PAR SÉJOUR (clé = stayId du corps) — à placer APRÈS l'authentification
//      (requireStayAuthFromBody) pour qu'un tiers qui ne connaît qu'un stayId
//      ne puisse pas épuiser le quota du vrai client.
// ─────────────────────────────────────────────────────────────
const paymentStayKey = (req: Request) =>
  `paystay:${String(req.body?.stayId ?? "").slice(0, 64)}`;

export const paymentIntentIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitedResponse("Trop de tentatives de paiement depuis cette connexion. Réessayez dans quelques minutes."),
});

export const paymentIntentStayLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  keyGenerator: paymentStayKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitedResponse("Trop de tentatives de paiement pour ce séjour. Patientez quelques minutes ou contactez la réception."),
});
