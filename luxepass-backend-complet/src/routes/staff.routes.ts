import { Router } from "express";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireStaffAuth, requireSameHotel, requireRole } from "../middleware/auth";
import {
  listPendingStaysQuerySchema,
  patchPmsSyncStatusSchema,
  policeFormsExportQuerySchema,
} from "../schemas";
import { checkinStore } from "../store/checkinStore";
import { NotFoundError } from "../utils/errors";

export const staffRouter = Router();

// GET /hotels/:hotelId/pending-stays?status=pending_pms_entry
// ⚠️ CORRECTIF SÉCURITÉ / RGPD (audit) : expose guestData complet (nom,
// n° pièce d'identité...). Restreint aux rôles en ayant réellement besoin
// (principe de minimisation, art. 5.1.c RGPD) — housekeeping/maintenance
// n'y ont plus accès.
staffRouter.get(
  "/hotels/:hotelId/pending-stays",
  requireStaffAuth,
  requireSameHotel("hotelId"),
  requireRole("reception", "gm", "super_admin"),
  validate({ query: listPendingStaysQuerySchema }),
  asyncHandler(async (req, res) => {
    const { hotelId } = req.params;
    const pending = await checkinStore.listPendingPmsEntry(hotelId);
    res.json({
      stays: pending.map((s) => ({
        stayId: s.stayId,
        guestData: s.guestData,
        children: s.children ?? [],
        room: s.room ?? null,
        completedAt: s.completedAt,
      })),
    });
  })
);

// PATCH /hotels/:hotelId/stays/:stayId/pms-sync-status
staffRouter.patch(
  "/hotels/:hotelId/stays/:stayId/pms-sync-status",
  requireStaffAuth,
  requireSameHotel("hotelId"),
  validate({ body: patchPmsSyncStatusSchema }),
  asyncHandler(async (req, res) => {
    const { stayId } = req.params;
    const session = await checkinStore.findByStayId(stayId);
    if (!session) throw new NotFoundError("Séjour");

    const updated = await checkinStore.markPmsSynced(session.id);
    res.json({ stayId, synced: updated!.pmsSynced });
  })
);

// GET /hotels/:hotelId/police-forms?date=YYYY-MM-DD
// ⚠️ CORRECTIF SÉCURITÉ / RGPD (audit) : fiches de police = données
// d'identité complètes (nom, n° pièce, nationalité...). Restreint aux
// rôles en ayant réellement besoin — housekeeping/maintenance exclus.
staffRouter.get(
  "/hotels/:hotelId/police-forms",
  requireStaffAuth,
  requireSameHotel("hotelId"),
  requireRole("reception", "gm", "super_admin"),
  validate({ query: policeFormsExportQuerySchema }),
  asyncHandler(async (req, res) => {
    const { hotelId } = req.params;
    const { date } = req.query as { date: string };
    const stays = await checkinStore.listByArrivalDate(hotelId, date);

    res.json({
      date,
      count: stays.length,
      forms: stays.map((s) => ({
        id: s.stayId,
        stayId: s.stayId,
        room: s.room ?? null,
        hasSignature: !!s.signatureDataUrl,
        submittedAt: s.completedAt,
        ...s.guestData,
      })),
    });
  })
);
