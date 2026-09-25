import { CookieOptions, Response } from "express";
import { config } from "../config";

// ─────────────────────────────────────────────────────────────
// MIGRATION SÉCURITÉ (localStorage → cookie HttpOnly) : le JWT de session
// staff/admin était renvoyé dans le corps JSON et stocké en localStorage
// côté client, lisible par n'importe quel script — donc exfiltrable par XSS.
// On le pose désormais dans un cookie HttpOnly, inaccessible à `document.cookie`
// / au JS du navigateur.
//
// Les DEUX jetons (access ET refresh) migrent vers des cookies : ne cookie-r
// que l'access token en laissant le refresh token dans le JSON/localStorage
// n'aurait fait que déplacer la faille XSS vers le jeton le plus sensible
// (7 j de validité, capable de reforger des access tokens à volonté).
// ─────────────────────────────────────────────────────────────

export const STAFF_SESSION_COOKIE = "staff_session";
export const STAFF_REFRESH_COOKIE = "staff_refresh";

// Parse une durée façon "15m" / "7d" / "60s" (même format que JWT_ACCESS_TTL /
// JWT_REFRESH_TTL) en millisecondes, pour servir de `maxAge` de cookie.
function parseTtlToMs(ttl: string): number {
  const m = /^(\d+)\s*([smhd])?$/i.exec(ttl.trim());
  if (!m) return 15 * 60 * 1000; // secours : 15 min
  const value = Number(m[1]);
  const unit = (m[2] ?? "s").toLowerCase();
  const multiplierSeconds = { s: 1, m: 60, h: 3600, d: 86400 }[unit] ?? 1;
  return value * multiplierSeconds * 1000;
}

function baseCookieOptions(maxAge: number): CookieOptions {
   return {
     httpOnly: true,
     // Secure obligatoire en production (HTTPS) ; désactivé en dev (http://localhost)
     // sinon le navigateur rejette silencieusement le cookie.
     secure: config.nodeEnv === "production",
-    sameSite: "lax",
+    // "none" est nécessaire car frontend et backend sont sur des domaines
+    // différents (luxepass-pms.onrender.com / luxepass-api.onrender.com) —
+    // un cookie cross-site n'est envoyé par le navigateur que s'il est
+    // SameSite=None, et SameSite=None exige Secure=true (donc uniquement en
+    // prod ; en dev localhost reste same-site, "lax" suffit).
+    sameSite: config.nodeEnv === "production" ? "none" : "lax",
     path: "/",
     maxAge,
   };
 }

// Pose les cookies staff_session (access) et staff_refresh (refresh) sur la
// réponse. À appeler après une connexion réussie, un refresh, ou un
// changement de mot de passe (qui émet une paire fraîche).
export function setStaffAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken?: string }
) {
  res.cookie(
    STAFF_SESSION_COOKIE,
    tokens.accessToken,
    baseCookieOptions(parseTtlToMs(config.jwt.accessTtl))
  );
  if (tokens.refreshToken) {
    res.cookie(
      STAFF_REFRESH_COOKIE,
      tokens.refreshToken,
      baseCookieOptions(parseTtlToMs(config.jwt.refreshTtl))
    );
  }
}

// Efface les deux cookies (déconnexion). clearCookie doit recevoir les mêmes
// attributs (path, sameSite, secure) que ceux posés à la création, sinon le
// navigateur peut ne pas le reconnaître comme le même cookie.
export function clearStaffAuthCookies(res: Response) {
  const opts = baseCookieOptions(0);
  res.clearCookie(STAFF_SESSION_COOKIE, opts);
  res.clearCookie(STAFF_REFRESH_COOKIE, opts);
}
