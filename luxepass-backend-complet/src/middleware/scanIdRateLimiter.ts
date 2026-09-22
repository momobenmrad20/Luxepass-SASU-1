import type { Request } from "express";
import rateLimit from "express-rate-limit";
import { isIP } from "node:net";

// ─────────────────────────────────────────────────────────────
// Rate limiting de POST /checkin-sessions/:sessionToken/scan-id.
//
// POURQUOI : cette route déclenche un appel de vision à l'API Anthropic
// (ocr.service.ts), donc un coût direct par requête. Sans plafond, un
// script qui rejoue l'endpoint vide le portefeuille (« wallet drain »).
//
// DEUX COUCHES, à monter dans cet ordre (cf. checkin.routes.ts) :
//
//   1. scanIdIpCeiling     — plafond LARGE par IP (60 / 15 min).
//      Sans lui, le plafond par session se contourne : créer une session de
//      check-in est public et peu coûteux (POST /hotels/:slug/checkin-sessions,
//      60 / 15 min / IP), et chaque session neuve reçoit un budget de 5 scans
//      tout neuf. Large à dessein : tout un hôtel sort par UNE IP (NAT du
//      wifi), voir publicRateLimit.ts.
//
//   2. scanIdRateLimiter   — plafond STRICT : 5 scans / 15 min.
//      Clé, par ordre de priorité :
//        a. stayId  (req.staySession, si un garde de séjour l'a posé)
//        b. sessionId du JWT de check-in (req.checkinSession)
//        c. IP du client (req.ip), regroupée par /64 pour l'IPv6
//      ⚠️ À l'étape scan-id, le stayId n'existe PAS encore : il est émis par
//      POST .../complete. L'identifiant du client est donc le sessionId
//      (b). La branche (a) ne sert que si la route est un jour appelée avec un
//      stayToken. Le limiteur doit être placé APRÈS requireCheckinSession
//      (sinon req.checkinSession est vide et tout retombe sur l'IP) et AVANT
//      multer (sinon le fichier est déjà en mémoire quand on refuse).
//
// FENÊTRE : express-rate-limit utilise une fenêtre FIXE par clé, démarrée à la
// première requête — pas une fenêtre glissante. Pire cas : 5 scans en fin de
// fenêtre + 5 au début de la suivante. Pour du glissant, il faut un store
// Redis avec un algorithme dédié (ex. rate-limiter-flexible).
//
// ⚠️ Compteurs en MÉMOIRE : remis à zéro au redémarrage et non partagés entre
// instances (comme publicRateLimit.ts). Avec plusieurs instances, passer à
// rate-limit-redis.
//
// ⚠️ Derrière un reverse proxy, req.ip est celui du proxy tant que
// TRUST_PROXY_HOPS n'est pas configuré (config.ts) : tous les clients sans
// session partageraient alors le même compteur.
// ─────────────────────────────────────────────────────────────

export const SCAN_ID_WINDOW_MS = 15 * 60 * 1000;
export const SCAN_ID_MAX_PER_KEY = 5;
export const SCAN_ID_MAX_PER_IP = 60;

const RATE_LIMIT_BODY = {
  error: "RATE_LIMIT_EXCEEDED",
  message:
    "Trop de tentatives de lecture de pièce d'identité. Veuillez patienter 15 minutes avant de réessayer.",
} as const;

// ── IP → clé de compteur ─────────────────────────────────────
// Une machine IPv6 contrôle en général tout un /64 : sans regroupement,
// changer d'adresse dans ce bloc (2^64 possibilités) contourne le plafond.

function expandIPv6(ip: string): string[] {
  let addr = ip.split("%")[0]; // zone id éventuelle (fe80::1%eth0)

  // Suffixe IPv4 (ex. 64:ff9b::192.0.2.1) → deux groupes hexadécimaux.
  const v4 = addr.match(/^(.*:)(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [, head, a, b, c, d] = v4;
    addr = `${head}${((+a << 8) | +b).toString(16)}:${((+c << 8) | +d).toString(16)}`;
  }

  const [left, right] = addr.split("::");
  const l = left ? left.split(":") : [];
  const r = right ? right.split(":") : [];
  const groups =
    right === undefined // pas de « :: » : les 8 groupes sont explicites
      ? l
      : [...l, ...Array<string>(8 - l.length - r.length).fill("0"), ...r];

  return groups.map((g) => g.toLowerCase().padStart(4, "0"));
}

export function normalizeIp(raw: string | undefined): string {
  if (!raw) return "unknown";

  // IPv4 mappée en IPv6 (::ffff:203.0.113.7) → IPv4 nue.
  const mapped = raw.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped) return mapped[1];

  if (isIP(raw) === 6) return `${expandIPv6(raw).slice(0, 4).join(":")}::/64`;
  return raw;
}

// ── Clé du limiteur strict ───────────────────────────────────
// Les identifiants sont tronqués : un store en mémoire ne doit pas grossir
// avec des valeurs arbitrairement longues.
export function scanIdKey(req: Request): string {
  const stayId = req.staySession?.stayId;
  if (stayId) return `stay:${stayId.slice(0, 64)}`;

  const sessionId = req.checkinSession?.sessionId;
  if (sessionId) return `session:${sessionId.slice(0, 64)}`;

  return `ip:${normalizeIp(req.ip)}`;
}

const commonOptions = {
  // draft-6 : en-têtes RateLimit-Limit / RateLimit-Remaining / RateLimit-Reset,
  // et Retry-After (secondes) ajouté automatiquement sur les réponses 429.
  standardHeaders: "draft-6",
  legacyHeaders: false,
  statusCode: 429,
  message: RATE_LIMIT_BODY,
} as const;

interface LimiterOptions {
  windowMs?: number;
  limit?: number;
}

// Fabriques exportées pour les tests (fenêtre courte, plafond bas, compteurs
// isolés). En production, ce sont les deux instances ci-dessous qui servent.
export function createScanIdRateLimiter(opts: LimiterOptions = {}) {
  return rateLimit({
    ...commonOptions,
    windowMs: opts.windowMs ?? SCAN_ID_WINDOW_MS,
    limit: opts.limit ?? SCAN_ID_MAX_PER_KEY,
    keyGenerator: scanIdKey,
  });
}

export function createScanIdIpCeiling(opts: LimiterOptions = {}) {
  return rateLimit({
    ...commonOptions,
    windowMs: opts.windowMs ?? SCAN_ID_WINDOW_MS,
    limit: opts.limit ?? SCAN_ID_MAX_PER_IP,
    keyGenerator: (req) => `ip:${normalizeIp(req.ip)}`,
  });
}

export const scanIdRateLimiter = createScanIdRateLimiter();
export const scanIdIpCeiling = createScanIdIpCeiling();
