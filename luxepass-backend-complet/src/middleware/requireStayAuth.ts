import { NextFunction, Request, Response } from "express";
import { ForbiddenError, NotFoundError, StayTokenError } from "../utils/errors";
import {
  StaffAccessPayload,
  StayTokenPayload,
  verifyStaffAccessToken,
  verifyStayToken,
} from "../utils/jwt";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // Payload décodé et vérifié du stayToken (posé par requireStayAuth
      // quand l'appelant est le CLIENT). Absent quand c'est le staff qui agit.
      staySession?: StayTokenPayload;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// requireStayAuth — garde de TOUTES les routes /stays/:stayId/* (PHASE 0 /
// ACTION 1). Deux appelants légitimes :
//
// A. LE CLIENT — stayToken
//    1. Extraction, dans cet ordre :
//         a. en-tête `X-Stay-Token: <stayToken>`
//         b. en-tête `Authorization: Bearer <stayToken>`
//       X-Stay-Token est prioritaire et STRICT : s'il est présent, seul un
//       stayToken valide est accepté (pas de repli sur Authorization, pas de
//       token staff). Il évite la collision avec un Bearer de session staff
//       dans un même navigateur.
//    2. Vérification JWT avec STAY_JWT_SECRET (HS256 épinglé, expiration) et
//       `type === "stay_pass"` (verifyStayToken, utils/jwt.ts). → 401
//       stay_token_missing | invalid | expired.
//    3. `stayId` du token === `req.params.stayId`, comparaison stricte : sans
//       ce contrôle, le token du séjour A ouvrirait le séjour B. → 403.
//    4. Payload décodé injecté dans `req.staySession`.
//
// B. LE STAFF HABILITÉ — JWT staff (accès), pour agir au nom du client
//    Uniquement via `Authorization: Bearer <accessToken staff>`, et seulement
//    quand ce Bearer n'est PAS un stayToken (signature stayToken invalide) :
//    un stayToken expiré ou d'un autre séjour n'ouvre jamais le repli staff.
//      - rôle ∈ { reception, gm, super_admin }, sinon 403 (housekeeping et
//        maintenance n'agissent pas au nom d'un client) ;
//      - reception / gm : le séjour doit appartenir à LEUR hôtel, sinon 404
//        (même réponse qu'un séjour inexistant : pas d'oracle d'existence
//        entre hôtels) ; super_admin : accès transverse, comme requireSameHotel ;
//      - `req.staff` est posé (comme requireStaffAuth) ; `req.staySession`
//        reste absent.
//    Seul ce chemin touche la base (1 lecture) ; le chemin client n'en fait aucune.
//
// Monté UNE fois dans index.ts sur `app.use("/stays/:stayId", ...)` : toute
// route /stays/:stayId/xxx — stay.routes, orders.routes, concierge.routes et
// les futures — est protégée par défaut (fail-closed), sans qu'il faille
// penser à ajouter le middleware route par route. Exécuté avant les
// limiteurs des routes, il évite aussi qu'un tiers connaissant un stayId
// épuise le quota concierge du client (limiteur clé par stayId).
//
// L'existence / l'état du séjour restent vérifiés par requireActiveStay dans
// chaque route.
//
// Exception explicite : GET /stays/:stayId/qr-verify est l'endpoint du STAFF
// (scan du QR à la réception) ; il s'authentifie par le qrToken HMAC, pas par
// un stayToken. Inchangé.
// ─────────────────────────────────────────────────────────────

const PUBLIC_ROUTES: ReadonlyArray<{ method: string; path: string }> = [
  { method: "GET", path: "/qr-verify" },
];

// Rôles staff autorisés à agir au nom d'un client.
export const STAY_STAFF_ROLES: ReadonlyArray<StaffAccessPayload["role"]> = [
  "reception",
  "gm",
  "super_admin",
];

export interface StayAuthDeps {
  // hotelId du séjour, ou undefined s'il n'existe pas. Appelé UNIQUEMENT sur
  // le chemin staff (reception / gm) pour l'isolation par hôtel.
  findStayHotelId: (stayId: string) => Promise<string | undefined>;
}

const defaultDeps: StayAuthDeps = {
  findStayHotelId: async (stayId) => {
    // Import paresseux : Prisma n'est chargé que lorsqu'un staff agit vraiment
    // (et les tests du garde n'en ont pas besoin).
    const { checkinStore } = await import("../store/checkinStore");
    return (await checkinStore.findByStayId(stayId))?.hotelId;
  },
};

export function extractStayToken(req: Request): string | null {
  const custom = customHeaderToken(req);
  if (custom) return custom;
  return bearerToken(req);
}

function customHeaderToken(req: Request): string | null {
  const raw = req.headers["x-stay-token"];
  // Node fusionne les doublons d'un en-tête personnalisé en une seule chaîne
  // (« a, b ») : le token résultant est invalide, donc rejeté par la
  // vérification de signature. On gère quand même le cas tableau par sûreté.
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && value.trim() ? value.trim() : null;
}

function bearerToken(req: Request): string | null {
  const m = /^Bearer\s+(\S.*)$/i.exec(req.headers.authorization ?? "");
  return m ? m[1].trim() : null;
}

function verifyGuest(req: Request, token: string): StayTokenPayload {
  const session = verifyStayToken(token);
  if (session.stayId !== req.params.stayId) {
    throw new ForbiddenError("Ce token ne correspond pas à ce séjour");
  }
  return session;
}

function tryVerifyStaff(token: string): StaffAccessPayload | null {
  try {
    const staff = verifyStaffAccessToken(token);
    // verifyStaffAccessToken ne contrôle pas `type` : on le fait ici.
    return staff.type === "access" ? staff : null;
  } catch {
    return null;
  }
}

async function authorizeStaff(staff: StaffAccessPayload, stayId: string, deps: StayAuthDeps) {
  if (!STAY_STAFF_ROLES.includes(staff.role)) {
    throw new ForbiddenError(`Rôle requis: ${STAY_STAFF_ROLES.join(", ")}`);
  }
  if (staff.role === "super_admin") return;
  const hotelId = await deps.findStayHotelId(stayId);
  if (!hotelId || hotelId !== staff.hotelId) throw new NotFoundError("Séjour");
}

export function makeRequireStayAuth(deps: StayAuthDeps) {
  return function requireStayAuth(req: Request, _res: Response, next: NextFunction) {
    // req.path est relatif au point de montage ("/stays/:stayId") → "/qr-verify".
    if (PUBLIC_ROUTES.some((r) => r.method === req.method && r.path === req.path)) {
      return next();
    }

    const custom = customHeaderToken(req);
    const token = custom ?? bearerToken(req);
    if (!token) {
      return next(
        new StayTokenError(
          "stay_token_missing",
          "Token de séjour manquant (Authorization: Bearer ou X-Stay-Token)"
        )
      );
    }

    let session: StayTokenPayload;
    try {
      session = verifyGuest(req, token);
    } catch (err) {
      // Repli staff : seulement pour un Bearer qui n'est pas un stayToken.
      const notAStayToken = err instanceof StayTokenError && err.code === "stay_token_invalid";
      if (custom || !notAStayToken) return next(err);

      const staff = tryVerifyStaff(token);
      if (!staff) return next(err);

      // Express 4 n'attrape pas les rejets de promesse : on route vers next().
      authorizeStaff(staff, req.params.stayId, deps).then(() => {
        req.staff = staff;
        next();
      }, next);
      return;
    }

    req.staySession = session;
    next();
  };
}

export const requireStayAuth = makeRequireStayAuth(defaultDeps);
