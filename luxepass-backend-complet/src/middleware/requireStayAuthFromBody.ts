import { NextFunction, Request, Response } from "express";
import { requireStayAuth } from "./requireStayAuth";

// ─────────────────────────────────────────────────────────────
// Garde de séjour pour les routes dont le stayId est dans le CORPS de la
// requête et non dans l'URL (ex. POST /payments/create-intent, qui n'est pas
// sous `/stays/:stayId` et échappe donc au montage global d'index.ts).
//
// On ne réécrit PAS l'authentification : on rend le stayId du corps visible
// sous `req.params.stayId` et on délègue à requireStayAuth, qui applique
// exactement les mêmes règles que pour /stays/:stayId/* (stayToken signé lié
// à CE stayId, sinon 403 ; repli staff réservé à reception / gm / super_admin).
//
// ⚠️ À placer APRÈS validate({ body }) : le stayId a déjà été typé/borné par
// Zod. Fail-closed : un stayId absent ne devrait pas arriver jusqu'ici, mais
// s'il arrive, requireStayAuth le compare au token et refuse.
// ─────────────────────────────────────────────────────────────
export function requireStayAuthFromBody(req: Request, res: Response, next: NextFunction) {
  const stayId = typeof req.body?.stayId === "string" ? req.body.stayId : "";
  req.params = { ...req.params, stayId };
  return requireStayAuth(req, res, next);
}
