import crypto from "crypto";
import { config } from "../config";

// ─────────────────────────────────────────────────────────────
// CORRECTIF SÉCURITÉ (README §11/§12, P0) : qr-verify ne comparait pas
// réellement le token, il en validait juste la forme — toute personne
// connaissant un stayId obtenait le nom du client et sa chambre.
//
// Ici : HMAC-SHA256(stayId) avec un secret dédié (qrPass.secret). Pas de
// stockage supplémentaire nécessaire, le token est recalculable à la
// volée. Émis une seule fois, à la complétion du check-in
// (checkin.routes.ts, étape 6), et renvoyé au client pour être encodé
// dans le QR aux côtés du stayId.
// ─────────────────────────────────────────────────────────────

export function signQrToken(stayId: string): string {
  return crypto.createHmac("sha256", config.qrPass.secret).update(stayId).digest("hex");
}

export function verifyQrToken(stayId: string, token: string): boolean {
  const expected = signQrToken(stayId);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(token, "hex");
  // timingSafeEqual exige deux buffers de même taille : un token de
  // mauvaise longueur est simplement rejeté (pas d'exception).
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
