import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireStaffAuth, requireSameHotel, requireRole, requireStreamToken } from "../middleware/auth";
import { supabaseAdmin } from "../lib/supabase";
import {
  hotelIdParamsSchema,
  hotelStayIdParamsSchema,
  requestIdParamsSchema,
  reportIdParamsSchema,
  orderIdParamsSchema,
  statusPatchSchema,
  pmsStatePatchSchema,
  createStaffSchema,
  staffIdParamsSchema,
} from "../schemas";
import { checkinStore } from "../store/checkinStore";
import { serviceRequestsStore } from "../store/serviceRequestsStore";
import { maintenanceStore } from "../store/maintenanceStore";
import { ordersStore } from "../store/ordersStore";
import { pmsStateStore } from "../store/pmsStateStore";
import { notesStore } from "../store/notesStore";
import { hotelStore, staffStore } from "../store/memoryStore";
import { checkinSessionParamsSchema } from "../schemas";
import { publicServicesQuerySchema } from "../schemas";
import { NotFoundError, ConflictError } from "../utils/errors";
import { requireActiveStay } from "../utils/requireActiveStay";
import { checkoutStay } from "../utils/checkoutStay";
import { translateServiceCatalog, AiServiceError } from "../services/ai.service";
import { getOrSet, invalidate, invalidatePrefix } from "../utils/shortCache";
import { signStreamToken } from "../utils/jwt";
import { subscribe as subscribeToHotelEvents, publish } from "../events/hotelEventBus";
import { catalogueLimiter } from "../middleware/publicRateLimit";

export const pmsRouter = Router();

// Validation du corps de la nouvelle route d'assignation de chambre —
// un simple texte, cohérent avec `CheckinSession.room` (String? en Prisma,
// pas de table Room/référentiel de chambres pour l'instant).
const roomAssignSchema = z.object({
  room: z.string().trim().min(1, "Chambre requise").max(20),
});

// Factorisée pour être réutilisée par GET /live-feed (snapshot ponctuel)
// et par le snapshot initial du flux SSE GET /live-feed/stream — même
// forme de réponse dans les deux cas, cf. docs/tasks/REALTIME_FEED.md §4.
async function getLiveFeedSnapshot(hotelId: string) {
  const [tickets, maintenance, orders, notes] = await Promise.all([
    serviceRequestsStore.listByHotel(hotelId),
    maintenanceStore.listByHotel(hotelId),
    ordersStore.listByHotel(hotelId),
    notesStore.listByHotel(hotelId),
  ]);
  return { tickets, maintenance, orders, notes };
}

// ── Séjours réels (remplace les mocks PMS_GUESTS/ROOMS_STATUS) ──
// GET /hotels/:hotelId/active-stays
// ⚠️ CORRECTIF SÉCURITÉ / RGPD (audit) : expose guestData complet.
// Restreint aux rôles en ayant réellement besoin (minimisation, art. 5.1.c).
pmsRouter.get(
  "/hotels/:hotelId/active-stays",
  requireStaffAuth,
  requireSameHotel("hotelId"),
  requireRole("reception", "gm", "super_admin"),
  validate({ params: hotelIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const { hotelId } = req.params;
    const stays = await checkinStore.listActiveStays(hotelId);
    res.json({
      stays: stays.map((s) => ({
        stayId: s.stayId,
        room: s.room ?? null,
        guestData: s.guestData ?? null,
        children: s.children ?? [],
        stage: s.stage, // "completed" (en séjour) | "checked_out"
        completedAt: s.completedAt,
      })),
    });
  })
);

// POST /hotels/:hotelId/stays/:stayId/checkout — check-out digital déclenché
// par la réception. Existe car POST /stays/:stayId/checkout exige désormais
// le stayToken du CLIENT (ACTION 1, PHASE 0), que le staff ne possède pas.
// Le séjour doit appartenir à l'hôtel de l'URL — requireSameHotel ne contrôle
// que le staff vs l'URL, pas le séjour vs l'URL : sans ce contrôle, un staff
// de l'hôtel A pourrait clôturer un séjour de l'hôtel B en visant son stayId.
pmsRouter.post(
  "/hotels/:hotelId/stays/:stayId/checkout",
  requireStaffAuth,
  requireSameHotel("hotelId"),
  requireRole("reception", "gm", "super_admin"),
  validate({ params: hotelStayIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const { hotelId, stayId } = req.params;
    const session = await requireActiveStay(stayId);
    if (session.hotelId !== hotelId) throw new NotFoundError("Séjour");
    res.json(await checkoutStay(session));
  })
);

// PATCH /hotels/:hotelId/stays/:stayId/room — assigne/corrige la chambre
// d'un séjour digital déjà complété (check-in fait via l'app client), pour
// la reprise manuelle PMS. `completeAndIssueStay` ne fixait `room` qu'à la
// création du séjour ; cette route permet de le faire après coup, une fois
// que la réception connaît le vrai numéro de chambre (ancien PMS). Ne
// touche à rien d'autre que le champ `room` — pas de lien avec un PMS
// externe pour l'instant (§13 roadmap : identification du PMS à faire).
// ⚠️ À ADAPTER : suppose une méthode `checkinStore.updateRoom(stayId, room)`
// qui n'existe probablement pas encore dans checkinStore.ts — voir note
// d'accompagnement pour l'implémentation suggérée.
pmsRouter.patch(
  "/hotels/:hotelId/stays/:stayId/room",
  requireStaffAuth,
  requireSameHotel("hotelId"),
  requireRole("reception", "gm", "super_admin"),
  validate({ params: hotelStayIdParamsSchema, body: roomAssignSchema }),
  asyncHandler(async (req, res) => {
    const { hotelId, stayId } = req.params;
    const { room } = req.body;
    const session = await requireActiveStay(stayId);
    if (session.hotelId !== hotelId) throw new NotFoundError("Séjour");
    const updated = await checkinStore.updateRoom(stayId, room);
    if (!updated) throw new NotFoundError("Séjour");
    res.json({ stayId: updated.stayId, room: updated.room });
  })
);

// ── Flux temps réel du hall (remplace pushTicket/appState local) ──
// GET /hotels/:hotelId/live-feed
pmsRouter.get(
  "/hotels/:hotelId/live-feed",
  requireStaffAuth,
  requireSameHotel("hotelId"),
  validate({ params: hotelIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const { hotelId } = req.params;
    res.json(await getLiveFeedSnapshot(hotelId));
  })
);

// ── POST /hotels/:hotelId/live-feed/stream-token ──
// Émet un token de très courte durée (STREAM_SESSION_TTL, 60s par défaut)
// pour ouvrir la connexion SSE ci-dessous. Nécessaire car EventSource ne
// peut pas porter de header Authorization — cf. docs/tasks/REALTIME_FEED.md
// §2. Mêmes permissions que GET /live-feed (tout le staff de l'hôtel).
pmsRouter.post(
  "/hotels/:hotelId/live-feed/stream-token",
  requireStaffAuth,
  requireSameHotel("hotelId"),
  validate({ params: hotelIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const { hotelId } = req.params;
    const streamToken = signStreamToken({
      sub: req.staff!.sub,
      hotelId,
      role: req.staff!.role,
    });
    res.json({ streamToken, expiresIn: 60 });
  })
);

// ── GET /hotels/:hotelId/live-feed/stream (SSE) ──
// Flux Server-Sent Events : un premier événement "snapshot" (même forme
// que GET /live-feed) pour ne pas laisser de trou entre le chargement
// initial et le premier événement poussé, puis un événement par mutation
// (cf. hotelEventBus). Heartbeat toutes les 20s pour garder la connexion
// ouverte à travers les proxys qui coupent les connexions HTTP inactives.
// Auth via requireStreamToken (query param, pas de header) — la vérif de
// hotelId est déjà faite dedans, requireSameHotel classique ne s'applique
// pas ici (pas de req.staff, EventSource ne porte pas de Bearer).
pmsRouter.get(
  "/hotels/:hotelId/live-feed/stream",
  requireStreamToken("hotelId"),
  validate({ params: hotelIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const { hotelId } = req.params;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      // Nginx et autres proxys bufferisent par défaut les réponses en
      // streaming, ce qui retarde l'arrivée des événements côté client —
      // ce header (convention de facto, pas standard HTTP) désactive ce
      // comportement quand le proxy le respecte.
      "X-Accel-Buffering": "no",
    });

    function send(event: string, data: unknown) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }

    // Snapshot initial — comble le trou entre le chargement de la page et
    // le premier événement poussé par le bus.
    send("snapshot", await getLiveFeedSnapshot(hotelId));

    const unsubscribe = subscribeToHotelEvents(hotelId, (event) => {
      send(event.type, event.data);
    });

    const heartbeat = setInterval(() => {
      res.write(`: heartbeat\n\n`);
    }, 20000);

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  })
);

// PATCH /hotels/:hotelId/service-requests/:requestId/status
pmsRouter.patch(
  "/hotels/:hotelId/service-requests/:requestId/status",
  requireStaffAuth,
  requireSameHotel("hotelId"),
  validate({ params: requestIdParamsSchema, body: statusPatchSchema }),
  asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const updated = await serviceRequestsStore.updateStatus(requestId, req.body.status);
    if (!updated) throw new NotFoundError("Demande de service");
    invalidate(`sr:${updated.stayId}`);
    publish(updated.hotelId, { type: "service_request.updated", data: updated });
    res.json(updated);
  })
);

// PATCH /hotels/:hotelId/maintenance-reports/:reportId/status
pmsRouter.patch(
  "/hotels/:hotelId/maintenance-reports/:reportId/status",
  requireStaffAuth,
  requireSameHotel("hotelId"),
  validate({ params: reportIdParamsSchema, body: statusPatchSchema }),
  asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    const updated = await maintenanceStore.updateStatus(reportId, req.body.status);
    if (!updated) throw new NotFoundError("Signalement maintenance");
    invalidate(`mnt:${updated.stayId}`);
    publish(updated.hotelId, { type: "maintenance.updated", data: updated });
    res.json(updated);
  })
);

// PATCH /hotels/:hotelId/orders/:orderId/status
pmsRouter.patch(
  "/hotels/:hotelId/orders/:orderId/status",
  requireStaffAuth,
  requireSameHotel("hotelId"),
  validate({ params: orderIdParamsSchema, body: statusPatchSchema }),
  asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const updated = await ordersStore.updateStatus(orderId, req.body.status);
    if (!updated) throw new NotFoundError("Commande");
    publish(updated.hotelId, { type: "order.updated", data: updated });
    res.json(updated);
  })
);

// ── Folios réels (facturation) — agrège commandes + demandes de service
// facturées, par séjour actif de l'hôtel. ──
// GET /hotels/:hotelId/folios
pmsRouter.get(
  "/hotels/:hotelId/folios",
  requireStaffAuth,
  requireSameHotel("hotelId"),
  validate({ params: hotelIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const { hotelId } = req.params;
    const stays = await checkinStore.listActiveStays(hotelId);
    const folios = await Promise.all(
      stays
        .filter((s) => s.stayId)
        .map(async (s) => {
          const [orders, servicesRaw] = await Promise.all([
            ordersStore.listByStay(s.stayId!),
            serviceRequestsStore.listByStay(s.stayId!),
          ]);
          const services = servicesRaw.filter((r) => r.price > 0);
          const ordersTotal = orders.reduce((sum, o) => sum + o.total, 0);
          const servicesTotal = services.reduce((sum, r) => sum + r.price, 0);
          // Commandes déjà réglées en ligne (PaymentIntent) : comptées dans `total`
          // (consommation), mais à NE PAS refacturer au checkout → `balanceDue`.
          const paidOnlineTotal = orders.filter((o) => o.paymentId).reduce((sum, o) => sum + o.total, 0);
          return {
            stayId: s.stayId,
            room: s.room ?? null,
            guestName: s.guestData ? `${s.guestData.firstName} ${s.guestData.lastName}` : null,
            orders,
            services,
            ordersTotal,
            servicesTotal,
            total: ordersTotal + servicesTotal,
            paidOnlineTotal,
            balanceDue: ordersTotal + servicesTotal - paidOnlineTotal,
          };
        })
    );
    res.json({
      folios,
      grandTotal: folios.reduce((sum, f) => sum + f.total, 0),
      grandBalanceDue: folios.reduce((sum, f) => sum + f.balanceDue, 0),
    });
  })
);

// ── Catalogue de services (public) ──
// GET /hotels/:hotelSlug/services
pmsRouter.get(
  "/hotels/:hotelSlug/services",
  catalogueLimiter,
  validate({ params: checkinSessionParamsSchema, query: publicServicesQuerySchema }),
  asyncHandler(async (req, res) => {
    const { hotelSlug } = req.params;
    const { lang } = req.query as unknown as { lang: "fr" | "en" | "ar" };
    const hotel = await hotelStore.findBySlug(hotelSlug);
    if (!hotel) throw new NotFoundError("Hôtel");

    // TTL un peu plus long qu'en Phase check-in : ce catalogue est le même
    // pour tous les clients de l'hôtel (contrairement aux données par
    // séjour), donc le gain de dédup est encore plus net avec plusieurs
    // clients connectés en même temps — et inclut ici l'appel IA de
    // traduction, plus coûteux qu'une simple requête Postgres.
    const payload = await getOrSet(`services:${hotel.id}:${lang}`, 8000, async () => {
      const state = await pmsStateStore.get(hotel.id);
      const services = (state.services as any[] | undefined) ?? null;

      if (services && lang !== "fr") {
        try {
          const translations = await translateServiceCatalog(
            services.map((s: any) => ({ id: s.id, name: s.name, category: s.category })),
            lang
          );
          return {
            services: services.map((s: any) => ({
              ...s,
              name: translations[s.id]?.name ?? s.name,
              category: translations[s.id]?.category ?? s.category,
            })),
          };
        } catch (err) {
          if (!(err instanceof AiServiceError)) throw err;
          // eslint-disable-next-line no-console
          console.error("[services] traduction indisponible, fallback FR:", err.message);
        }
      }
      return { services };
    });

    res.json(payload);
  })
);

// ── État persisté des modules PMS sans modèle dédié pour l'instant ──
// GET /hotels/:hotelId/pms-state
// ⚠️ CORRECTIF SÉCURITÉ / RGPD (README §11-12) : accessible jusqu'ici à
// tout le staff de l'hôtel (housekeeping, maintenance inclus), alors que
// ce module peut porter des données de réservation/CRM. Restreint aux
// rôles en ayant réellement besoin, même logique que /active-stays.
pmsRouter.get(
  "/hotels/:hotelId/pms-state",
  requireStaffAuth,
  requireSameHotel("hotelId"),
  requireRole("reception", "gm", "super_admin"),
  validate({ params: hotelIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const { hotelId } = req.params;
    res.json({ state: await pmsStateStore.get(hotelId) });
  })
);

// PATCH /hotels/:hotelId/pms-state
pmsRouter.patch(
  "/hotels/:hotelId/pms-state",
  requireStaffAuth,
  requireSameHotel("hotelId"),
  requireRole("reception", "gm", "super_admin"),
  validate({ params: hotelIdParamsSchema, body: pmsStatePatchSchema }),
  asyncHandler(async (req, res) => {
    const { hotelId } = req.params;
    const state = await pmsStateStore.patch(hotelId, req.body);
    if (Object.prototype.hasOwnProperty.call(req.body, "services")) {
      invalidatePrefix(`services:${hotelId}:`);
    }
    res.json({ state });
  })
);

// ── Comptes staff (Équipe & Permissions) ──
// Réservé aux rôles gm / super_admin.

// GET /hotels/:hotelId/staff
pmsRouter.get(
  "/hotels/:hotelId/staff",
  requireStaffAuth,
  requireSameHotel("hotelId"),
  requireRole("gm", "super_admin"),
  validate({ params: hotelIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const { hotelId } = req.params;
    const staffList = await staffStore.listByHotel(hotelId);
    res.json({
      staff: staffList.map((s) => ({
        id: s.id,
        email: s.email,
        role: s.role,
        name: s.name ?? null,
      })),
    });
  })
);

// POST /hotels/:hotelId/staff
pmsRouter.post(
  "/hotels/:hotelId/staff",
  requireStaffAuth,
  requireSameHotel("hotelId"),
  requireRole("gm", "super_admin"),
  validate({ params: hotelIdParamsSchema, body: createStaffSchema }),
  asyncHandler(async (req, res) => {
    const { hotelId } = req.params;
    const { email, password, role, name } = req.body;

    const hotel = await hotelStore.findById(hotelId);
    if (!hotel) throw new NotFoundError("Hôtel");
    if (await staffStore.findByEmail(email)) {
      throw new ConflictError("Un compte existe déjà avec cet email");
    }

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError || !authUser.user) {
      throw new ConflictError("Impossible de créer le compte : " + (authError?.message ?? "erreur inconnue"));
    }

    const created = await staffStore.create({
      email,
      passwordHash: null,
      supabaseUserId: authUser.user.id,
      hotelId,
      role,
      name,
    });
    res.status(201).json({ id: created.id, email: created.email, role: created.role, name: created.name ?? null });
  })
);
// DELETE /hotels/:hotelId/staff/:staffId
pmsRouter.delete(
  "/hotels/:hotelId/staff/:staffId",
  requireStaffAuth,
  requireSameHotel("hotelId"),
  requireRole("gm", "super_admin"),
  validate({ params: staffIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const { staffId } = req.params;
    if (req.staff!.sub === staffId) {
      throw new ConflictError("Vous ne pouvez pas supprimer votre propre compte");
    }
    const deleted = await staffStore.delete(staffId);
    if (!deleted) throw new NotFoundError("Compte staff");
    res.status(204).send();
  })
);
                                   
