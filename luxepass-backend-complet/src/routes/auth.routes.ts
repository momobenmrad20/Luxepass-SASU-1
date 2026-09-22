import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireStaffAuth } from "../middleware/auth";
import {
  changePasswordSchema,
  refreshTokenSchema,
  staffLoginSchema,
} from "../schemas";
import { staffStore } from "../store/memoryStore";
import { UnauthorizedError } from "../utils/errors";
import {
  signStaffAccessToken,
  signStaffRefreshToken,
  verifyStaffRefreshToken,
} from "../utils/jwt";
import {
  STAFF_REFRESH_COOKIE,
  clearStaffAuthCookies,
  setStaffAuthCookies,
} from "../utils/cookies";

export const authRouter = Router();

// ─────────────────────────────────────────────────────────────
// CORRECTIF SÉCURITÉ (audit) : /auth/login n'avait aucune protection
// anti brute-force / credential stuffing. Limite par IP : 10 tentatives
// par 15 min, sans compter les connexions réussies. À affiner en prod
// (ex: clé par email + IP, backend partagé Redis si plusieurs instances).
// ─────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: "too_many_requests",
    message: "Trop de tentatives de connexion. Réessayez dans quelques minutes.",
  },
});

// POST /auth/login
authRouter.post(
  "/login",
  loginLimiter,
  validate({ body: staffLoginSchema }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const staff = await staffStore.findByEmail(email);
    // Comparaison même si l'email n'existe pas, pour éviter le timing attack
    // qui révèle l'existence d'un compte via la latence de réponse.
    const passwordHash = staff?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva";
    const validPassword = await bcrypt.compare(password, passwordHash);

    if (!staff || !validPassword) {
      throw new UnauthorizedError("Email ou mot de passe incorrect");
    }

    const accessToken = signStaffAccessToken({
      sub: staff.id,
      hotelId: staff.hotelId,
      role: staff.role,
    });
    const refreshToken = signStaffRefreshToken({
      sub: staff.id,
      tokenVersion: staff.tokenVersion,
    });

    // MIGRATION SÉCURITÉ (audit) : les jetons ne sont plus renvoyés dans le
    // corps JSON (donc plus stockables en localStorage, exfiltrables par
    // XSS) — ils sont posés en cookies HttpOnly. Le navigateur les rejoue
    // automatiquement (fetch avec `credentials: 'include'` côté front).
    setStaffAuthCookies(res, { accessToken, refreshToken });

    res.json({
      staff: { id: staff.id, email: staff.email, role: staff.role, hotelId: staff.hotelId },
    });
  })
);

// POST /auth/refresh
authRouter.post(
  "/refresh",
  validate({ body: refreshTokenSchema }),
  asyncHandler(async (req, res) => {
    // Chemin normal (client web) : le refresh token voyage dans le cookie
    // HttpOnly staff_refresh. Repli sur le corps JSON pour un client Bearer
    // sans cookie (mobile/API).
    const refreshToken = req.cookies?.[STAFF_REFRESH_COOKIE] ?? req.body.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedError("Refresh token manquant");
    }
    const payload = verifyStaffRefreshToken(refreshToken);

    const staff = await staffStore.findById(payload.sub);
    if (!staff || staff.tokenVersion !== payload.tokenVersion) {
      // tokenVersion différent => mot de passe changé / refresh révoqué depuis
      throw new UnauthorizedError("Refresh token révoqué");
    }

    const accessToken = signStaffAccessToken({
      sub: staff.id,
      hotelId: staff.hotelId,
      role: staff.role,
    });

    // Ne repose QUE le cookie d'accès (le refresh token, lui, n'a pas changé).
    setStaffAuthCookies(res, { accessToken });
    res.json({ ok: true });
  })
);

// POST /auth/logout
// ─────────────────────────────────────────────────────────────
// AJOUT (migration cookie HttpOnly) : jusqu'ici la "déconnexion" n'était
// que locale (effacement du localStorage côté front) puisque le jeton n'y
// vivait que là. Un cookie HttpOnly n'est, par définition, pas accessible
// en JS pour être effacé côté client — il faut une route serveur qui
// renvoie un Set-Cookie d'expiration immédiate.
// ─────────────────────────────────────────────────────────────
authRouter.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    clearStaffAuthCookies(res);
    res.json({ ok: true });
  })
);

// POST /auth/change-password
authRouter.post(
  "/change-password",
  requireStaffAuth,
  validate({ body: changePasswordSchema }),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const staff = await staffStore.findById(req.staff!.sub);
    if (!staff) throw new UnauthorizedError();

    const validCurrent = await bcrypt.compare(currentPassword, staff.passwordHash);
    if (!validCurrent) {
      throw new UnauthorizedError("Mot de passe actuel incorrect");
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await staffStore.updatePasswordHash(staff.id, newHash);

    // tokenVersion a été incrémenté par updatePasswordHash: tous les
    // anciens refresh tokens sont désormais invalides — on émet une paire
    // fraîche pour ne pas déconnecter la session en cours.
    const refreshed = (await staffStore.findById(staff.id))!;
    const accessToken = signStaffAccessToken({
      sub: refreshed.id,
      hotelId: refreshed.hotelId,
      role: refreshed.role,
    });
    const refreshToken = signStaffRefreshToken({
      sub: refreshed.id,
      tokenVersion: refreshed.tokenVersion,
    });

    // Client web (cookie) : on repose les cookies, rien de sensible dans le
    // JSON. Client Bearer (mobile/API, sans cookie) : on renvoie encore la
    // paire en clair, faute d'autre mécanisme pour la lui remettre.
    setStaffAuthCookies(res, { accessToken, refreshToken });
    if (req.staffAuthSource === "header") {
      res.json({ accessToken, refreshToken });
    } else {
      res.json({ ok: true });
    }
  })
);

// ─────────────────────────────────────────────────────────────
// AJOUT (README §12, P0) : absent jusqu'ici. Le frontend en a besoin pour
// restaurer une session staff après rechargement (rôle, hôtel) sans
// redemander email/mot de passe. Relit staffStore plutôt que de se fier
// uniquement au payload du JWT, pour refléter un rôle/hôtel changé depuis
// l'émission du token.
// ─────────────────────────────────────────────────────────────

// GET /auth/me
authRouter.get(
  "/me",
  requireStaffAuth,
  asyncHandler(async (req, res) => {
    const staff = await staffStore.findById(req.staff!.sub);
    if (!staff) throw new UnauthorizedError();

    res.json({
      staff: { id: staff.id, email: staff.email, role: staff.role, hotelId: staff.hotelId },
    });
  })
);
