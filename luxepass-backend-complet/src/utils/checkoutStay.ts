import { checkinStore, CheckinSessionRecord } from "../store/checkinStore";
import { publish } from "../events/hotelEventBus";

// ─────────────────────────────────────────────────────────────
// Clôture d'un séjour — logique partagée par les deux points d'entrée :
//  - client : POST /stays/:stayId/checkout            (auth : stayToken)
//  - staff  : POST /hotels/:hotelId/stays/:stayId/checkout (auth : staff)
// Le contrôle d'accès (qui a le droit de clôturer) reste dans chaque route ;
// ici on ne fait que la transition d'état + l'événement live-feed.
// ─────────────────────────────────────────────────────────────
export async function checkoutStay(session: CheckinSessionRecord) {
  const stayId = session.stayId!;
  const record = await checkinStore.checkout(stayId);
  publish(session.hotelId, {
    type: "stay.checked_out",
    data: {
      stayId,
      room: session.room ?? null,
      guestName: session.guestData
        ? `${session.guestData.firstName} ${session.guestData.lastName}`
        : null,
    },
  });
  return { stayId, status: record?.stage ?? "checked_out" };
}
