import { Router } from "express";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import { stayIdParamsSchema, postConciergeMessageSchema } from "../schemas";
import { requireOpenStay } from "../utils/requireActiveStay";
import { notesStore } from "../store/notesStore";
import { serviceRequestsStore } from "../store/serviceRequestsStore";
import { getConciergeReply, AiServiceError, ConciergeSentiment } from "../services/ai.service";
import { publish } from "../events/hotelEventBus";
import { conciergeLimiter, conciergeStayLimiter, conciergeStayDailyLimiter } from "../middleware/publicRateLimit";

// Toutes les routes /stays/:stayId/* de ce fichier sont protégées par
// requireStayAuth (stayToken client, ou JWT staff reception/gm/super_admin),
// monté une fois sur `/stays/:stayId` dans index.ts AVANT ce router — voir
// middleware/requireStayAuth.ts.
export const conciergeRouter = Router();

function priorityFromSentiment(sentiment: ConciergeSentiment): "LOW" | "MED" | "HIGH" {
  if (sentiment === "urgent" || sentiment === "negative") return "HIGH";
  if (sentiment === "positive") return "LOW";
  return "MED";
}

function degradedReply(lang: string): string {
  if (lang === "en") return "This has been forwarded to our team, we'll get back to you shortly.";
  if (lang === "ar") return "تم التوصيل لفريقنا، وسنعود إليك خلال دقائق.";
  return "C'est transmis à notre équipe, je reviens vers vous dans quelques minutes.";
}

// POST /stays/:stayId/concierge/messages
// Body: { message, lang } → { reply, sentiment, ticketCreated, escalateToHuman, degraded }
// Séjour clôturé refusé (requireOpenStay, §11) : évite qu'un concierge IA
// crée encore des notes/tickets de service après le départ du client.
conciergeRouter.post(
  "/stays/:stayId/concierge/messages",
  conciergeLimiter, // par IP (large : NAT hôtelier)
  validate({ params: stayIdParamsSchema, body: postConciergeMessageSchema }),
  conciergeStayLimiter, // par séjour : protège le coût de l'API Anthropic
  conciergeStayDailyLimiter,
  asyncHandler(async (req, res) => {
    const { stayId } = req.params;
    const { message, lang } = req.body;
    const session = await requireOpenStay(stayId);
    const guestData = session.guestData;

    const recentNotes = await notesStore.listByStay(stayId);
    const memoryNotes = recentNotes.slice(-8).map((n) => n.text);
    const recentRequestsRaw = await serviceRequestsStore.listByStay(stayId);
    const recentRequests = recentRequestsRaw.slice(0, 5).map((r) => r.req);

    try {
      const result = await getConciergeReply({
        message,
        lang,
        guest: {
          firstName: guestData?.firstName,
          profession: guestData?.profession,
          from: guestData?.from,
          arrival: guestData?.arrival,
          departure: guestData?.departure,
          occupants: guestData?.occupants,
          room: session.room ?? undefined,
        },
        memoryNotes,
        recentRequests,
      });

      if (result.memoryNote) {
        const note = await notesStore.add(stayId, session.hotelId, session.room ?? undefined, result.memoryNote);
        publish(session.hotelId, { type: "note.added", data: note });
      }

      let ticketCreated = false;
      if (result.actionRequest) {
        const record = await serviceRequestsStore.create(
          stayId,
          session.hotelId,
          session.room ?? undefined,
          {
            req: result.actionRequest,
            priority: priorityFromSentiment(result.sentiment),
            price: 0,
          },
          result.sentiment
        );
        publish(session.hotelId, { type: "service_request.created", data: record });
        ticketCreated = true;
      }

      res.json({
        reply: result.reply,
        sentiment: result.sentiment,
        memoryNote: result.memoryNote,
        ticketCreated,
        escalateToHuman: result.escalateToHuman,
        degraded: false,
      });
    } catch (err) {
      if (!(err instanceof AiServiceError)) throw err;

      // eslint-disable-next-line no-console
      console.error("[concierge] AI indisponible, mode dégradé:", err.message);
      const record = await serviceRequestsStore.create(stayId, session.hotelId, session.room ?? undefined, {
        req: message,
        priority: "MED",
        price: 0,
      });
      publish(session.hotelId, { type: "service_request.created", data: record });
      res.json({
        reply: degradedReply(lang),
        sentiment: "neutral",
        memoryNote: null,
        ticketCreated: true,
        escalateToHuman: false,
        degraded: true,
      });
    }
  })
);
