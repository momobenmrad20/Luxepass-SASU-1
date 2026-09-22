import { checkinStore, CheckinSessionRecord } from "../store/checkinStore";
import { ConflictError, NotFoundError } from "./errors";

// ─────────────────────────────────────────────────────────────
// Vérifie l'ÉTAT du séjour (existe, check-in terminé). Ce n'est plus une
// authentification : depuis l'ACTION 1 (PHASE 0), l'accès aux routes
// /stays/:stayId/* est gardé en amont par requireStayAuth (JWT signé lié à
// ce stayId, cf. middleware/requireStayAuth.ts). Ces deux fonctions restent
// nécessaires : un token valide peut survivre à une clôture ou à une
// suppression du séjour.
//
// checkinStore est Prisma/async : tous les appelants font
// `await requireActiveStay(...)`.
// ─────────────────────────────────────────────────────────────

export async function requireActiveStay(stayId: string): Promise<CheckinSessionRecord> {
  const session = await checkinStore.findByStayId(stayId);
  if (!session || (session.stage !== "completed" && session.stage !== "checked_out")) {
    throw new NotFoundError("Séjour");
  }
  return session;
}

// Pour les routes d'ÉCRITURE qui créent un enregistrement lié au séjour
// (commande, demande de service, ticket maintenance, message concierge...) :
// en plus d'exiger un séjour existant, on refuse tout séjour déjà clôturé.
// Sans ce contrôle, un `stayToken` volé (ou simplement conservé par le
// client) reste valable jusqu'à son expiration même après le checkout
// (§11 « Points ouverts » — pas de révocation), ce qui permettait de créer
// des commandes ou tickets « fantômes » après le départ effectif du client.
// Les LECTURES restent volontairement autorisées après `checked_out` (le
// client doit pouvoir consulter son folio, ses demandes passées, etc.) :
// n'utiliser cette fonction que pour les routes d'écriture.
export async function requireOpenStay(stayId: string): Promise<CheckinSessionRecord> {
  const session = await requireActiveStay(stayId);
  if (session.stage === "checked_out") {
    throw new ConflictError("Ce séjour est déjà clôturé");
  }
  return session;
}

// Pour les actions qui facturent sur le folio (commandes...) : en plus
// d'exiger un séjour ouvert (pas `checked_out`), on vérifie qu'un moyen de
// paiement est bien associé.
export async function requireActiveStayWithPayment(stayId: string): Promise<CheckinSessionRecord> {
  const session = await requireOpenStay(stayId);
  if (!session.paymentMethod) {
    throw new ConflictError("Aucun moyen de paiement associé à ce séjour");
  }
  return session;
}
