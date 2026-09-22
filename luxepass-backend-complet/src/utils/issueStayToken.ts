import type { CheckinSessionRecord } from "../store/checkinStore";
import { signStayToken } from "./jwt";

// ─────────────────────────────────────────────────────────────
// Émission du stayToken d'un séjour à partir de sa fiche en base. Point
// unique partagé par :
//  - POST /checkin-sessions/:sessionToken/complete (étape 6 du check-in)
//  - GET  /stays/:stayId/pass (renvoi / renouvellement, client ou staff)
// `import type` : aucun chargement de Prisma à l'exécution.
// ─────────────────────────────────────────────────────────────
export function issueStayToken(session: CheckinSessionRecord): string {
  return signStayToken({
    stayId: session.stayId!,
    hotelId: session.hotelId,
    room: session.room,
    guestName: session.guestData
      ? `${session.guestData.firstName} ${session.guestData.lastName}`
      : "",
    departure: session.guestData?.departure,
    createdAt: session.createdAt,
  });
}
