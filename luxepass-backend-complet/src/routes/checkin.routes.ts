import { Router } from "express";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireCheckinSession } from "../middleware/checkinSession";
import { checkinCreateLimiter, qrVerifyLimiter } from "../middleware/publicRateLimit";
import { scanIdIpCeiling, scanIdRateLimiter } from "../middleware/scanIdRateLimiter";
import { uploadIdScan } from "../middleware/upload";
import {
  checkinSessionParamsSchema,
  patchGuestDataSchema,
  postPaymentMethodSchema,
  postSignatureSchema,
  postCompleteCheckinSchema,
  qrVerifyQuerySchema,
  scanIdParamsSchema,
  stayChildrenListSchema,
} from "../schemas";
import { hotelStore } from "../store/memoryStore";
import { checkinStore } from "../store/checkinStore";
import { NotFoundError, ConflictError } from "../utils/errors";
import { signCheckinSessionToken } from "../utils/jwt";
import { issueStayToken } from "../utils/issueStayToken";
import { signQrToken, verifyQrToken } from "../utils/qrToken";
import { processIdDocument } from "../services/ocr.service";
import { publish } from "../events/hotelEventBus";

export const checkinRouter = Router();

// ── 1. Démarrage d'un check-in ──
// POST /hotels/:hotelSlug/checkin-sessions
checkinRouter.post(
  "/hotels/:hotelSlug/checkin-sessions",
  checkinCreateLimiter,
  validate({ params: checkinSessionParamsSchema }),
  asyncHandler(async (req, res) => {
    const { hotelSlug } = req.params;
    const hotel = await hotelStore.findBySlug(hotelSlug);
    if (!hotel) throw new NotFoundError("Hôtel");

    const session = await checkinStore.create(hotel.id, hotel.slug);
    const sessionToken = signCheckinSessionToken({
      sessionId: session.id,
      hotelSlug: hotel.slug,
      stage: session.stage,
    });

    res.status(201).json({ sessionToken, stage: session.stage });
  })
);

// ── 2. Scan OCR ──
// POST /checkin-sessions/:sessionToken/scan-id
// Chaque appel coûte un appel de vision Anthropic : deux limiteurs
// (cf. scanIdRateLimiter.ts). L'ORDRE COMPTE :
//   - scanIdIpCeiling   avant requireCheckinSession : coupe le spam grossier
//                       avant même la lecture en base de la session ;
//   - scanIdRateLimiter APRÈS requireCheckinSession : il lit
//                       req.checkinSession comme clé de compteur ;
//   - les deux AVANT uploadIdScan : un scan refusé n'est jamais mis en mémoire.
checkinRouter.post(
  "/checkin-sessions/:sessionToken/scan-id",
  validate({ params: scanIdParamsSchema }),
  scanIdIpCeiling,
  requireCheckinSession,
  scanIdRateLimiter,
  uploadIdScan,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ConflictError("Aucun fichier reçu (champ 'idDocument' attendu)");
    }

    // { firstName?, lastName?, age?, gender?, idNumber?, from?, documentType?,
    //   confidence } — jamais arrival/departure/destination/occupants (dates
    // de SÉJOUR, pas du document, cf. ocr.service.ts). `confidence: "low"`
    // signale au front qu'il doit insister sur la relecture avant
    // confirmation (PATCH /guest-data), mais ne bloque jamais le parcours :
    // le client peut toujours tout corriger/saisir à la main.
    const extracted = await processIdDocument(req.file.buffer, req.file.mimetype);

    await checkinStore.update(req.checkinSession!.sessionId, { stage: "scanned" });

    res.json({ stage: "scanned", extracted });
  })
);

// ── 3. Données invité (édition/confirmation post-OCR) ──
// PATCH /checkin-sessions/:sessionToken/guest-data
checkinRouter.patch(
  "/checkin-sessions/:sessionToken/guest-data",
  validate({ params: scanIdParamsSchema, body: patchGuestDataSchema }),
  requireCheckinSession,
  asyncHandler(async (req, res) => {
    const updated = await checkinStore.update(req.checkinSession!.sessionId, {
      guestData: req.body,
      stage: "guest_data",
    });
    res.json({ stage: updated!.stage, guestData: updated!.guestData });
  })
);

// ── 3bis. Enfants du séjour (optionnel, réutilise stayChildrenListSchema) ──
// PATCH /checkin-sessions/:sessionToken/children
checkinRouter.patch(
  "/checkin-sessions/:sessionToken/children",
  validate({ params: scanIdParamsSchema, body: stayChildrenListSchema }),
  requireCheckinSession,
  asyncHandler(async (req, res) => {
    const updated = await checkinStore.update(req.checkinSession!.sessionId, {
      children: req.body,
    });
    res.json({ children: updated!.children ?? [] });
  })
);

// ── 4. Signature ──
// POST /checkin-sessions/:sessionToken/signature
checkinRouter.post(
  "/checkin-sessions/:sessionToken/signature",
  validate({ params: scanIdParamsSchema, body: postSignatureSchema }),
  requireCheckinSession,
  asyncHandler(async (req, res) => {
    if (!req.checkinSession) throw new NotFoundError("Session");
    const current = await checkinStore.get(req.checkinSession.sessionId);
    if (!current?.guestData) {
      throw new ConflictError(
        "Les données invité doivent être confirmées avant la signature"
      );
    }
    const updated = await checkinStore.update(req.checkinSession.sessionId, {
      signatureDataUrl: req.body.signatureDataUrl,
      stage: "signed",
    });
    res.json({ stage: updated!.stage });
  })
);

// ── 5. Paiement (empreinte bancaire — jamais de PAN/CVV côté serveur) ──
// POST /checkin-sessions/:sessionToken/payment-method
checkinRouter.post(
  "/checkin-sessions/:sessionToken/payment-method",
  validate({ params: scanIdParamsSchema, body: postPaymentMethodSchema }),
  requireCheckinSession,
  asyncHandler(async (req, res) => {
    const current = await checkinStore.get(req.checkinSession!.sessionId);
    if (current?.stage !== "signed") {
      throw new ConflictError("La signature doit précéder le paiement");
    }
    const updated = await checkinStore.update(req.checkinSession!.sessionId, {
      paymentMethod: req.body,
      stage: "paid",
    });
    res.json({ stage: updated!.stage });
  })
);

// ── 6. Finalisation ──
// POST /checkin-sessions/:sessionToken/complete
checkinRouter.post(
  "/checkin-sessions/:sessionToken/complete",
  validate({ params: scanIdParamsSchema, body: postCompleteCheckinSchema }),
  requireCheckinSession,
  asyncHandler(async (req, res) => {
    const current = await checkinStore.get(req.checkinSession!.sessionId);
    if (current?.stage !== "paid") {
      throw new ConflictError("Le paiement doit être confirmé avant finalisation");
    }
    const completed = await checkinStore.completeAndIssueStay(
      req.checkinSession!.sessionId,
      req.body.room
    );

    publish(completed!.hotelId, {
      type: "stay.completed",
      data: {
        stayId: completed!.stayId!,
        room: completed!.room ?? null,
        guestName: completed!.guestData
          ? `${completed!.guestData.firstName} ${completed!.guestData.lastName}`
          : null,
      },
    });

    // PHASE 0 / ACTION 1 : token de séjour signé. C'est désormais LUI (et non
    // plus le stayId seul) qui ouvre les routes /stays/:stayId/*. Émis
    // au terme d'un check-in complet (puis renvoyé/renouvelé par GET
    // /stays/:stayId/pass) : le client le conserve (localStorage) et le renvoie
    // en `Authorization: Bearer` ou `X-Stay-Token`.
    const stayToken = issueStayToken(completed!);

    res.json({
      stage: completed!.stage,
      stayId: completed!.stayId,
      room: completed!.room ?? null,
      // À encoder dans le QR aux côtés du stayId (ex. /pass/:stayId?token=...) —
      // c'est ce token que qr-verify recalcule et compare.
      qrToken: signQrToken(completed!.stayId!),
      // À conserver côté client et envoyer en `Authorization: Bearer` sur
      // toutes les routes /stays/:stayId/*. NE PAS l'encoder dans le QR :
      // le QR est montré au staff, le stayToken est le secret du client.
      stayToken,
    });
  })
);

// ── GET /stays/:stayId/qr-verify?token=... ──
checkinRouter.get(
  "/stays/:stayId/qr-verify",
  qrVerifyLimiter,
  validate({ query: qrVerifyQuerySchema }),
  asyncHandler(async (req, res) => {
    const { stayId } = req.params;
    const { token } = req.query as { token: string };
    const session = await checkinStore.findByStayId(stayId);
    if (!session || session.stage !== "completed" || !verifyQrToken(stayId, token)) {
      return res.json({ valid: false });
    }
    res.json({
      valid: true,
      guestName: session.guestData
        ? `${session.guestData.firstName} ${session.guestData.lastName}`
        : null,
      room: session.room ?? null,
    });
  })
);
