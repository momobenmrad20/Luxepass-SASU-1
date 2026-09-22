// ─────────────────────────────────────────────────────────────
// qrPayload.js — format du QR du pass de séjour LuxePass.
//
// Le QR encode un JSON compact :  {"v":1,"s":"<stayId>","t":"<qrToken>"}
//   s = stayId (identifiant opaque du séjour)
//   t = qrToken HMAC renvoyé par POST /checkin-sessions/:token/complete
//       (vérifié côté serveur par GET /stays/:stayId/qr-verify?token=…)
//
// decodeQrPayload accepte aussi l'URL de vérification complète
//   https://…/stays/<stayId>/qr-verify?token=<qrToken>
// pour rester compatible avec un futur QR « lien ».
// ─────────────────────────────────────────────────────────────

export const QR_PAYLOAD_VERSION = 1;

export function encodeQrPayload({ stayId, qrToken }) {
  if (!stayId) throw new Error("encodeQrPayload : stayId manquant");
  const payload = { v: QR_PAYLOAD_VERSION, s: stayId };
  if (qrToken) payload.t = qrToken;
  return JSON.stringify(payload);
}

// → { stayId, qrToken } ou null si le texte n'est pas un QR LuxePass.
// qrToken vaut null si le QR ne porte pas de jeton (non vérifiable).
export function decodeQrPayload(raw) {
  const text = (raw ?? "").trim();
  if (!text) return null;

  if (text.startsWith("{")) {
    try {
      const o = JSON.parse(text);
      if (o && o.v === QR_PAYLOAD_VERSION && typeof o.s === "string" && o.s) {
        return { stayId: o.s, qrToken: typeof o.t === "string" && o.t ? o.t : null };
      }
    } catch { /* JSON invalide : on tente le format URL ci-dessous */ }
    return null;
  }

  try {
    const url = new URL(text);
    const m = url.pathname.match(/\/stays\/([^/]+)\/qr-verify\/?$/);
    if (m) return { stayId: decodeURIComponent(m[1]), qrToken: url.searchParams.get("token") || null };
  } catch { /* pas une URL */ }
  return null;
}
