import { EventEmitter } from "events";
import type { ServiceRequestRecord } from "../store/serviceRequestsStore";
import type { MaintenanceRecord } from "../store/maintenanceStore";
import type { OrderRecord } from "../store/ordersStore";
import type { NoteRecord } from "../store/notesStore";

// ─────────────────────────────────────────────────────────────
// Bus d'événements interne, un par process (singleton, sur le modèle de
// src/prisma.ts) — cf. docs/tasks/REALTIME_FEED.md §3.
//
// Sert à pousser vers les connexions SSE ouvertes (GET
// /hotels/:hotelId/live-feed/stream, à venir) les mutations qui
// intéressent le live-feed staff : nouvelles demandes de service,
// signalements maintenance, commandes, notes, et leurs changements de
// statut.
//
// ⚠️ Limite connue et assumée pour cette phase (identique à
// src/utils/shortCache.ts) : ce bus est local au process. En
// mono-instance (situation actuelle), aucun souci. Si le backend tourne
// un jour sur plusieurs instances, un abonné sur l'instance A ne verra
// pas les événements publiés depuis l'instance B — il faudra alors migrer
// vers un pub/sub partagé (Redis PUBLISH/SUBSCRIBE, Supabase Realtime,
// ou équivalent) sans changer la surface publique de ce module
// (publish/subscribe), pour limiter l'impact sur les appelants.
// ─────────────────────────────────────────────────────────────

export type HotelEvent =
  | { type: "service_request.created"; data: ServiceRequestRecord }
  | { type: "service_request.updated"; data: ServiceRequestRecord }
  | { type: "maintenance.created"; data: MaintenanceRecord }
  | { type: "maintenance.updated"; data: MaintenanceRecord }
  | { type: "order.created"; data: OrderRecord }
  | { type: "order.updated"; data: OrderRecord }
  | { type: "note.added"; data: NoteRecord }
  // AJOUT (README §12, P1) : le staff n'était prévenu ni d'une arrivée
  // (check-in terminé) ni d'un départ (checkout) par le live-feed SSE.
  | { type: "stay.completed"; data: StayLifecycleEvent }
  | { type: "stay.checked_out"; data: StayLifecycleEvent }
  // AJOUT (Stripe Elements frontend + webhook, docs/PAYMENTS.md) : le staff
  // n'était notifié que d'un paiement RÉUSSI (order.created). Un échec
  // (carte refusée) est silencieux côté live-feed — utile en réception pour
  // proposer un autre moyen de paiement sans attendre que le client se
  // manifeste.
  | { type: "payment.failed"; data: PaymentFailedEvent };

export interface PaymentFailedEvent {
  stayId: string;
  paymentId: string;
  category: string;
  amount: number;
  currency: string;
  failureMessage: string | null;
}

export interface StayLifecycleEvent {
  stayId: string;
  room: string | null;
  guestName: string | null;
}

export type HotelEventHandler = (event: HotelEvent) => void;

// Un EventEmitter par process, mais un "topic" (nom d'événement) distinct
// par hôtel — évite qu'un abonné de l'hôtel A reçoive les événements de
// l'hôtel B, et évite d'avoir à filtrer côté abonné.
const emitter = new EventEmitter();

// Beaucoup d'onglets/appareils staff peuvent s'abonner au même hôtel en
// simultané (plusieurs membres du staff, plusieurs postes) — on relève la
// limite par défaut de Node (10) pour ne pas déclencher le warning
// MaxListenersExceededWarning en usage normal. Purement défensif : ce
// n'est pas une fuite si le nombre de connexions SSE simultanées reste
// raisonnable pour un seul hôtel.
emitter.setMaxListeners(50);

function topic(hotelId: string): string {
  return `hotel:${hotelId}`;
}

/** Publie un événement pour tous les abonnés actuels de cet hôtel. Aucun
 * effet si personne n'est abonné (pas de file d'attente, pas de rejeu —
 * un abonné qui se connecte après coup reçoit d'abord un snapshot via la
 * route SSE, pas les événements manqués). */
export function publish(hotelId: string, event: HotelEvent): void {
  emitter.emit(topic(hotelId), event);
}

/** S'abonne aux événements d'un hôtel. Retourne une fonction de
 * désabonnement à appeler impérativement (ex: sur req.on("close") côté
 * route SSE) pour éviter d'accumuler des listeners au fil des connexions
 * fermées. */
export function subscribe(hotelId: string, handler: HotelEventHandler): () => void {
  emitter.on(topic(hotelId), handler);
  return () => {
    emitter.off(topic(hotelId), handler);
  };
}

/** Nombre d'abonnés actifs pour un hôtel — utile pour les tests et un
 * éventuel endpoint de diagnostic, pas utilisé en chemin critique. */
export function subscriberCount(hotelId: string): number {
  return emitter.listenerCount(topic(hotelId));
}
