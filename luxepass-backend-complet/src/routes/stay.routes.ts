import { Router } from "express";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  stayIdParamsSchema,
  postServiceRequestSchema,
  postMaintenanceReportSchema,
  postNoteSchema,
} from "../schemas";
import { serviceRequestsStore } from "../store/serviceRequestsStore";
import { maintenanceStore } from "../store/maintenanceStore";
import { notesStore } from "../store/notesStore";
import { requireActiveStay, requireActiveStayWithPayment, requireOpenStay } from "../utils/requireActiveStay";
import { getOrSet, invalidate } from "../utils/shortCache";
import { publish } from "../events/hotelEventBus";
import { checkoutStay } from "../utils/checkoutStay";
import { issueStayToken } from "../utils/issueStayToken";
import { signQrToken } from "../utils/qrToken";
import { StayTokenAbsoluteCapError } from "../utils/errors";

// Toutes les routes /stays/:stayId/* de ce fichier sont protégées par
// requireStayAuth (stayToken client, ou JWT staff reception/gm/super_admin),
// monté une fois sur `/stays/:stayId` dans index.ts AVANT ce router — voir
// middleware/requireStayAuth.ts.
export const stayRouter = Router();

// ⚠️ CORRECTIF PERF (préparation pilote) : le front interroge ces endpoints
// toutes les 6-8s, potentiellement depuis plusieurs onglets/appareils du
// même client (ou plusieurs testeurs en simultané). Ce TTL déduplique les
// requêtes Postgres identiques arrivant dans cette fenêtre, sans dégrader
// la fraîcheur perçue (largement inférieur à l'intervalle de polling front).
const POLL_CACHE_TTL_MS = 4000;

// ── Demandes de service ─────────────────────────────────────
// POST /stays/:stayId/service-requests
stayRouter.post(
  "/stays/:stayId/service-requests",
  validate({ params: stayIdParamsSchema, body: postServiceRequestSchema }),
  asyncHandler(async (req, res) => {
    const { stayId } = req.params;
    // Un prix > 0 (ex: late check-out payant) facture le folio : on exige
    // donc un moyen de paiement dans ce cas, sinon une simple demande
    // gratuite (serviettes, oreiller...) ne le nécessite pas. Dans les deux
    // cas, le séjour ne doit pas être déjà clôturé (pas de ticket « fantôme »
    // après le départ, §11).
    const session =
      req.body.price > 0
        ? await requireActiveStayWithPayment(stayId)
        : await requireOpenStay(stayId);

    const record = await serviceRequestsStore.create(
      stayId,
      session.hotelId,
      session.room ?? undefined,
      req.body
    );
    invalidate(`sr:${stayId}`);
    publish(session.hotelId, { type: "service_request.created", data: record });
    res.status(201).json({ requestId: record.id, status: record.status });
  })
);

// GET /stays/:stayId/service-requests
stayRouter.get(
  "/stays/:stayId/service-requests",
  validate({ params: stayIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const { stayId } = req.params;
    await requireActiveStay(stayId);
    const requests = await getOrSet(`sr:${stayId}`, POLL_CACHE_TTL_MS, () =>
      serviceRequestsStore.listByStay(stayId)
    );
    res.json({ requests });
  })
);

// ── Signalements maintenance ────────────────────────────────
// POST /stays/:stayId/maintenance-reports
stayRouter.post(
  "/stays/:stayId/maintenance-reports",
  validate({ params: stayIdParamsSchema, body: postMaintenanceReportSchema }),
  asyncHandler(async (req, res) => {
    const { stayId } = req.params;
    const session = await requireOpenStay(stayId);
    const record = await maintenanceStore.create(
      stayId,
      session.hotelId,
      session.room ?? undefined,
      req.body
    );
    invalidate(`mnt:${stayId}`);
    publish(session.hotelId, { type: "maintenance.created", data: record });
    res.status(201).json({
      ticket: record.ticket,
      status: record.status,
      issue: record.issue,
      equipment: record.equipment,
    });
  })
);

// GET /stays/:stayId/maintenance-reports
stayRouter.get(
  "/stays/:stayId/maintenance-reports",
  validate({ params: stayIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const { stayId } = req.params;
    await requireActiveStay(stayId);
    const reports = await getOrSet(`mnt:${stayId}`, POLL_CACHE_TTL_MS, () =>
      maintenanceStore.listByStay(stayId)
    );
    res.json({ reports });
  })
);

// ── Notes concierge (mémoire des préférences) ───────────────
// POST /stays/:stayId/notes
stayRouter.post(
  "/stays/:stayId/notes",
  validate({ params: stayIdParamsSchema, body: postNoteSchema }),
  asyncHandler(async (req, res) => {
    const { stayId } = req.params;
    const session = await requireOpenStay(stayId);
    const record = await notesStore.add(stayId, session.hotelId, session.room ?? undefined, req.body.text);
    publish(session.hotelId, { type: "note.added", data: record });
    res.status(201).json({ noteId: record.id });
  })
);

// GET /stays/:stayId/notes
stayRouter.get(
  "/stays/:stayId/notes",
  validate({ params: stayIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const { stayId } = req.params;
    await requireActiveStay(stayId);
    res.json({ notes: await notesStore.listByStay(stayId) });
  })
);

// DELETE /stays/:stayId/notes — efface toute la mémoire (bouton "effacer mes données")
stayRouter.delete(
  "/stays/:stayId/notes",
  validate({ params: stayIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const { stayId } = req.params;
    await requireActiveStay(stayId);
    await notesStore.clearByStay(stayId);
    res.status(204).end();
  })
);

// ── Checkout ─────────────────────────────────────────────────
// POST /stays/:stayId/checkout
// Auth : requireStayAuth (monté sur /stays/:stayId dans index.ts) — stayToken
// du client, ou JWT staff habilité. Le PMS utilise de préférence la route
// dédiée POST /hotels/:hotelId/stays/:stayId/checkout (pms.routes.ts), qui
// porte l'hôtel dans l'URL et applique requireSameHotel.
stayRouter.post(
  "/stays/:stayId/checkout",
  validate({ params: stayIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const { stayId } = req.params;
    const session = await requireActiveStay(stayId);
    res.json(await checkoutStay(session));
  })
);

// ── Pass numérique ───────────────────────────────────────────
// GET /stays/:stayId/pass
// AJOUT (README §12, P1) : le PRD note l'absence d'un endpoint dédié pour
// que le client puisse recharger son pass (nom, chambre, QR) sans avoir
// gardé la réponse de l'étape 6 du check-in — utile après fermeture de
// l'onglet. Protégé par requireStayAuth comme le reste de /stays/:stayId/* :
// avant l'ACTION 1, quiconque connaissait le stayId obtenait ici le qrToken.
//
// Renvoie aussi un `stayToken` (ACTION 1) — l'appelant a déjà prouvé son droit
// d'accès, soit avec un stayToken valide (renouvellement : le client restaure
// son espace après un rechargement), soit avec un JWT staff habilité
// (reception / gm de l'hôtel, super_admin : agir au nom du client). La durée de
// vie est recalculée sur la date de départ, pas prolongée à l'infini ; pour un
// séjour sans date de départ, chaque appel repart sur le TTL par défaut (7 j).
// CORRECTIF (README §12) : ce renouvellement répété était auparavant borné
// par rien d'autre que le TTL par défaut lui-même — un token intercepté
// pouvait donc être renouvelé indéfiniment tant que le séjour restait
// ouvert. Un plafond ABSOLU (`createdAt + STAY_TOKEN_ABSOLUTE_MAX_DAYS`,
// 30 j par défaut) borne désormais chaque émission, avec ou sans date de
// départ.
// Aucun nouveau token une fois le séjour `checked_out`, OU une fois ce
// plafond absolu dépassé (`stayToken: null` dans les deux cas) :
// le pass reste consultable, mais plus aucun accès n'est (ré)émis.
stayRouter.get(
  "/stays/:stayId/pass",
  validate({ params: stayIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const { stayId } = req.params;
    const session = await requireActiveStay(stayId);

    // CORRECTIF : au-delà du plafond absolu (createdAt + STAY_TOKEN_ABSOLUTE_
    // MAX_DAYS), issueStayToken lève StayTokenAbsoluteCapError plutôt que de
    // réémettre un token — mêmes conséquences visibles que `checked_out` :
    // le pass reste consultable, plus aucun accès n'est (ré)émis.
    let stayToken: string | null = null;
    if (session.stage !== "checked_out") {
      try {
        stayToken = issueStayToken(session);
      } catch (err) {
        if (!(err instanceof StayTokenAbsoluteCapError)) throw err;
      }
    }

    res.json({
      stayId,
      room: session.room ?? null,
      guestName: session.guestData
        ? `${session.guestData.firstName} ${session.guestData.lastName}`
        : null,
      status: session.stage, // "completed" (en séjour) | "checked_out"
      qrToken: signQrToken(stayId), // à encoder dans le QR avec stayId — cf. qr-verify
      stayToken,
    });
  })
);
