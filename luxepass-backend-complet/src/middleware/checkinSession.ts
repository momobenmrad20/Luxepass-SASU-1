import { NextFunction, Request, Response } from "express";
import { verifyCheckinSessionToken, CheckinSessionPayload } from "../utils/jwt";
import { checkinStore } from "../store/checkinStore";
import { NotFoundError } from "../utils/errors";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      checkinSession?: CheckinSessionPayload;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Le sessionToken transite dans le param d'URL :sessionToken
// (cf. scanIdParamsSchema) plutôt qu'en Bearer header, pour
// coller exactement au contrat d'API déjà défini dans
// phase0_api_checkin.md / schemas_zod_phase0.ts.
// ─────────────────────────────────────────────────────────────

export async function requireCheckinSession(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const token = req.params.sessionToken;
    const payload = verifyCheckinSessionToken(token);

    const session = await checkinStore.get(payload.sessionId);
    if (!session) {
      return next(new NotFoundError("Session de check-in"));
    }

    req.checkinSession = payload;
    next();
  } catch (err) {
    next(err);
  }
}
identityDocument IdentityDocument?
