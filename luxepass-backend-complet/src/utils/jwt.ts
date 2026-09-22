import jwt from "jsonwebtoken";
import { config } from "../config";
import { SessionExpiredError, StayTokenError, UnauthorizedError } from "./errors";
import { computeStayTokenTtlSeconds, secondsUntilAbsoluteCap } from "./stayTokenTtl";
import { StayTokenAbsoluteCapError } from "./errors";

// ─────────────────────────────────────────────────────────────
// Familles de tokens bien séparées :
//  1. Tokens STAFF (access + refresh) — pour le PMS / Super Admin
//  2. sessionToken CHECK-IN — un JWT court-circuité sur un flux
//     de check-in précis (pas de notion de "compte utilisateur")
//  3. stream_token SSE — ouverture du live-feed staff (60 s)
//  4. stayToken — preuve d'accès du CLIENT à son séjour (/stays/:stayId/*)
// Les secrets sont différents pour qu'une fuite d'un côté ne
// compromette pas l'autre.
// ─────────────────────────────────────────────────────────────

export interface StaffAccessPayload {
  sub: string; // staffId
  hotelId: string;
  role: "reception" | "gm" | "housekeeping" | "maintenance" | "super_admin";
  type: "access";
}

export interface StaffRefreshPayload {
  sub: string;
  type: "refresh";
  tokenVersion: number; // incrémenté pour révoquer tous les refresh tokens d'un coup
}

export interface CheckinSessionPayload {
  sessionId: string;
  hotelSlug: string;
  stage: "started" | "scanned" | "guest_data" | "signed" | "paid" | "completed" | "checked_out";
  type: "checkin_session";
}

// ─────────────────────────────────────────────────────────────
// Token de streaming SSE (live-feed PMS) — cf. docs/tasks/REALTIME_FEED.md
// §2. Émis par POST /hotels/:hotelId/live-feed/stream-token (staff déjà
// authentifié), TTL très court : sert uniquement à ouvrir la connexion
// EventSource (qui ne peut pas porter de header Authorization), pas à
// autoriser des actions REST. Reprend hotelId + role pour que la route de
// streaming applique les mêmes contrôles d'accès que le reste du module PMS
// (requireSameHotel / restrictions par rôle) sans requête DB supplémentaire.
// ─────────────────────────────────────────────────────────────

export interface StreamTokenPayload {
  sub: string; // staffId
  hotelId: string;
  role: "reception" | "gm" | "housekeeping" | "maintenance" | "super_admin";
  type: "stream_session";
}

export function signStreamToken(payload: Omit<StreamTokenPayload, "type">) {
  return jwt.sign({ ...payload, type: "stream_session" }, config.stream.sessionSecret, {
    expiresIn: config.stream.sessionTtl,
  });
}

export function verifyStreamToken(token: string): StreamTokenPayload {
  try {
    const decoded = jwt.verify(token, config.stream.sessionSecret) as StreamTokenPayload;
    if (decoded.type !== "stream_session") throw new Error("wrong type");
    return decoded;
  } catch {
    throw new UnauthorizedError("Token de streaming invalide ou expiré");
  }
}

export function signStaffAccessToken(payload: Omit<StaffAccessPayload, "type">) {
  return jwt.sign({ ...payload, type: "access" }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessTtl,
  });
}

export function signStaffRefreshToken(payload: Omit<StaffRefreshPayload, "type">) {
  return jwt.sign({ ...payload, type: "refresh" }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshTtl,
  });
}

export function verifyStaffAccessToken(token: string): StaffAccessPayload {
  try {
    return jwt.verify(token, config.jwt.accessSecret) as StaffAccessPayload;
  } catch {
    throw new UnauthorizedError("Token d'accès invalide ou expiré");
  }
}

export function verifyStaffRefreshToken(token: string): StaffRefreshPayload {
  try {
    return jwt.verify(token, config.jwt.refreshSecret) as StaffRefreshPayload;
  } catch {
    throw new UnauthorizedError("Refresh token invalide ou expiré");
  }
}

export function signCheckinSessionToken(
  payload: Omit<CheckinSessionPayload, "type">
) {
  return jwt.sign(
    { ...payload, type: "checkin_session" },
    config.checkin.sessionSecret,
    { expiresIn: config.checkin.sessionTtl }
  );
}

export function verifyCheckinSessionToken(token: string): CheckinSessionPayload {
  try {
    const decoded = jwt.verify(
      token,
      config.checkin.sessionSecret
    ) as CheckinSessionPayload;
    if (decoded.type !== "checkin_session") throw new Error("wrong type");
    return decoded;
  } catch {
    throw new SessionExpiredError();
  }
}

// ─────────────────────────────────────────────────────────────
// stayToken (PHASE 0 / ACTION 1) — JWT signé remis au client à la
// complétion du check-in (POST /checkin-sessions/:sessionToken/complete).
// Il remplace le `stayId` opaque comme preuve d'accès aux routes
// /stays/:stayId/* : connaître ou deviner un stayId ne suffit plus.
//
// Payload minimal — pas de PII au-delà de ce qui est déjà affiché sur le
// pass (nom, chambre). Un JWT est signé, PAS chiffré : lisible par quiconque
// détient le token (le client lui-même), donc rien de sensible dedans.
// Durée de vie : fin du jour de départ + marge, sinon 7 j
// (cf. stayTokenTtl.ts). Pas de révocation côté serveur : l'expiration est
// la seule borne (voir README, points ouverts).
// ─────────────────────────────────────────────────────────────

export interface StayTokenPayload {
  stayId: string;
  hotelId: string;
  room?: string;
  guestName: string;
  type: "stay_pass";
}

export interface StayTokenInput {
  stayId: string;
  hotelId: string;
  room?: string | null;
  guestName: string;
  // guestData.departure (YYYY-MM-DD) — pilote le TTL ; absent → TTL par défaut.
  departure?: string | null;
  // Création du séjour (fiche check-in) — ANCRE le plafond absolu ; ne
  // change jamais d'un renouvellement à l'autre, contrairement à `now`.
  createdAt: Date | string;
}

export function signStayToken(input: StayTokenInput, now: Date = new Date()): string {
  const payload: StayTokenPayload = {
    stayId: input.stayId,
    hotelId: input.hotelId,
    guestName: input.guestName,
    type: "stay_pass",
    ...(input.room ? { room: input.room } : {}),
  };
  const ttlSeconds = computeStayTokenTtlSeconds(input.departure, now, config.stay.graceHours);
  const defaultTtlSeconds = parseDefaultTtlSeconds(config.stay.defaultTtl);
  const requestedTtlSeconds = ttlSeconds ?? defaultTtlSeconds;

  // CORRECTIF : plafond absolu ancré sur `createdAt`, appliqué dans TOUS les
  // cas (avec ou sans `departure` exploitable). Sans lui, un séjour sans
  // date de départ repartait sur `defaultTtl` (7 j) à CHAQUE appel de
  // GET /pass — un token intercepté restait donc renouvelable sans limite
  // tant que le séjour n'était pas `checked_out`.
  const capSeconds = secondsUntilAbsoluteCap(input.createdAt, now, config.stay.absoluteMaxDays);
  if (capSeconds <= 0) {
    throw new StayTokenAbsoluteCapError(
      `stayToken refusé : plafond absolu de ${config.stay.absoluteMaxDays} j depuis la création du séjour dépassé`
    );
  }
  const effectiveTtlSeconds = Math.min(requestedTtlSeconds, capSeconds);

  return jwt.sign(payload, config.stay.jwtSecret, {
    algorithm: "HS256",
    expiresIn: effectiveTtlSeconds,
  });
}

// `defaultTtl` reste configurable en chaîne (ex. "7d") pour la lisibilité de
// l'env ; on la résout une fois en secondes pour pouvoir la comparer/plafonner
// au même titre que le TTL calculé depuis `departure`.
function parseDefaultTtlSeconds(defaultTtl: string): number {
  const m = /^(\d+)\s*([smhd])?$/i.exec(defaultTtl.trim());
  if (!m) return 7 * 24 * 60 * 60; // secours : 7 j, ne devrait pas arriver (validé au démarrage)
  const value = Number(m[1]);
  const unit = (m[2] ?? "s").toLowerCase();
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[unit] ?? 1;
  return value * multiplier;
}

export function verifyStayToken(token: string): StayTokenPayload {
  let decoded: string | jwt.JwtPayload;
  try {
    // Algorithme épinglé : on n'accepte que HS256 (pas de "none", pas de
    // confusion d'algorithme).
    decoded = jwt.verify(token, config.stay.jwtSecret, { algorithms: ["HS256"] });
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new StayTokenError("stay_token_expired", "Le token de séjour a expiré");
    }
    throw new StayTokenError("stay_token_invalid", "Token de séjour invalide");
  }

  if (
    typeof decoded === "string" ||
    decoded.type !== "stay_pass" ||
    typeof decoded.stayId !== "string" || !decoded.stayId ||
    typeof decoded.hotelId !== "string" || !decoded.hotelId
  ) {
    throw new StayTokenError("stay_token_invalid", "Token de séjour invalide");
  }
  return decoded as unknown as StayTokenPayload;
}
