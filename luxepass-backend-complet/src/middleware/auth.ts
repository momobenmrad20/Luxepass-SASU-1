import { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../utils/errors";
import { StaffAccessPayload, StreamTokenPayload, verifyStaffAccessToken, verifyStreamToken } from "../utils/jwt";
import { STAFF_SESSION_COOKIE } from "../utils/cookies";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      staff?: StaffAccessPayload;
      streamAuth?: StreamTokenPayload;
      // "cookie" | "header" — d'où venait le token staff validé, cf.
      // auth.routes.ts (change-password) qui s'en sert pour savoir s'il doit
      // reposer les cookies ou renvoyer les jetons en JSON (client Bearer).
      staffAuthSource?: "cookie" | "header";
    }
  }
}

// ─────────────────────────────────────────────────────────────
// requireStaffAuth — exige une session staff valide, attache req.staff.
// requireRole(...) restreint en plus par rôle.
//
// MIGRATION SÉCURITÉ (localStorage → cookie HttpOnly) : le token est lu en
// priorité depuis le cookie HttpOnly `staff_session` (posé par POST
// /auth/login, cf. utils/cookies.ts) — c'est le chemin normal pour le
// frontend web. Le header `Authorization: Bearer` reste accepté en repli,
// pour la rétrocompatibilité temporaire et pour d'éventuels clients
// mobiles/API qui ne portent pas de cookie de navigateur.
// ─────────────────────────────────────────────────────────────

export function requireStaffAuth(req: Request, _res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.[STAFF_SESSION_COOKIE];
  if (cookieToken) {
    req.staff = verifyStaffAccessToken(cookieToken);
    req.staffAuthSource = "cookie";
    return next();
  }

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Session staff manquante"));
  }
  const token = header.slice("Bearer ".length);
  req.staff = verifyStaffAccessToken(token);
  req.staffAuthSource = "header";
  next();
}

export function requireRole(...roles: StaffAccessPayload["role"][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.staff) return next(new UnauthorizedError());
    if (!roles.includes(req.staff.role)) {
      return next(
        new ForbiddenError(`Rôle requis: ${roles.join(" ou ")}`)
      );
    }
    next();
  };
}

// Un membre du staff ne peut agir que sur son propre hôtel,
// sauf s'il est super_admin (accès transverse).
export function requireSameHotel(hotelIdParam: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.staff) return next(new UnauthorizedError());
    if (req.staff.role === "super_admin") return next();
    const targetHotelId = req.params[hotelIdParam];
    if (req.staff.hotelId !== targetHotelId) {
      return next(new ForbiddenError("Accès limité à votre établissement"));
    }
    next();
  };
}

// ─────────────────────────────────────────────────────────────
// requireStreamToken — auth dédiée au flux SSE (GET .../live-feed/stream).
// EventSource ne peut pas porter de header Authorization : le token
// transite donc en query param (?stream_token=...), sur le même principe
// que req.params.sessionToken pour le check-in (cf. checkinSession.ts).
// Vérifie en plus que le token a bien été émis pour l'hôtel demandé, pour
// appliquer la même isolation que requireSameHotel sans requête DB
// supplémentaire (l'info est déjà dans le JWT). Cf.
// docs/tasks/REALTIME_FEED.md §2.
// ─────────────────────────────────────────────────────────────
export function requireStreamToken(hotelIdParam: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const token = req.query.stream_token;
    if (typeof token !== "string" || !token) {
      return next(new UnauthorizedError("Paramètre stream_token manquant"));
    }
    const payload = verifyStreamToken(token);
    if (payload.role !== "super_admin" && payload.hotelId !== req.params[hotelIdParam]) {
      return next(new ForbiddenError("Accès limité à votre établissement"));
    }
    req.streamAuth = payload;
    next();
  };
}
