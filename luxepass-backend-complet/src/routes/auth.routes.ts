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
import { supabaseAuth, supabaseAdmin } from "../lib/supabase";

export const authRouter = Router();

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
    if (!staff || !staff.supabaseUserId) {
      await supabaseAuth.auth.signInWithPassword({
        email: "no-such-user@luxepass.invalid",
        password,
      });
      throw new UnauthorizedError("Email ou mot de passe incorrect");
    }

    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
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
    const refreshToken = req.cookies?.[STAFF_REFRESH_COOKIE] ?? req.body.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedError("Refresh token manquant");
    }
    const payload = verifyStaffRefreshToken(refreshToken);

    const staff = await staffStore.findById(payload.sub);
    if (!staff || staff.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedError("Refresh token révoqué");
    }

    const accessToken = signStaffAccessToken({
      sub: staff.id,
      hotelId: staff.hotelId,
      role: staff.role,
    });

    setStaffAuthCookies(res, { accessToken });
    res.json({ ok: true });
  })
);

// POST /auth/logout
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
    if (!staff || !staff.supabaseUserId) throw new UnauthorizedError();

    const { error: verifyError } = await supabaseAuth.auth.signInWithPassword({
      email: staff.email,
      password: currentPassword,
    });
    if (verifyError) {
      throw new UnauthorizedError("Mot de passe actuel incorrect");
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      staff.supabaseUserId,
      { password: newPassword }
    );
    if (updateError) {
      throw updateError;
    }

    await staffStore.updatePasswordHash(staff.id, staff.passwordHash ?? await bcrypt.hash(newPassword, 10));

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

    setStaffAuthCookies(res, { accessToken, refreshToken });
    if (req.staffAuthSource === "header") {
      res.json({ accessToken, refreshToken });
    } else {
      res.json({ ok: true });
    }
  })
);

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
