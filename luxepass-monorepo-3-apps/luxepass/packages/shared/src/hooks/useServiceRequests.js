// @ts-check
import { useCallback, useEffect, useState } from "react";
import { ApiError, stayApi } from "../api/apiClient";
import { useAppState } from "./useAppState";

/**
 * Demandes du séjour côté client : suivi des demandes de service et des
 * signalements maintenance (polling 8 s), envoi de nouveaux tickets vers le PMS
 * (état local live*) et le backend, et état générique des actions branchées au
 * backend (actionError / actionSubmitting).
 *
 * Extrait tel quel de ClientDashboard — même logique, mêmes noms.
 *
 * À appeler UNE fois, dans ClientDashboard : deux appels du hook n'auraient pas
 * le même état. Les fonctions push* sont ensuite passées aux onglets (props).
 * actionError / actionSubmitting sont aussi lus et écrits par doCheckout, resté
 * dans ClientDashboard : d'où setActionError / setActionSubmitting exposés
 * (à retirer quand le checkout rejoindra useStay).
 *
 * @param {{ guest: import("../types").Guest, room: string }} args
 * @returns {import("../types").UseServiceRequestsValue}
 */
export function useServiceRequests({ guest, room }) {
  const { setAppState } = useAppState();
  const guestId = guest?.guestId;

  // ── État générique pour les autres actions branchées au backend
  // (demande de service, checkout) — indépendant de orderSubmitting/orderError
  // pour ne pas mélanger les messages entre le panier et ces actions.
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  // ── Suivi de mes demandes (réclamations + demandes de service) ──
  // Le backend sait déjà changer le statut (pending → in_progress → done)
  // côté staff (pms.routes.ts) ; jusqu'ici le client ne relisait jamais ce
  // statut. On l'affiche ici et on le rafraîchit périodiquement pour un
  // suivi quasi temps réel (mêmes principes que refreshPmsData côté staff).
  const [myRequests, setMyRequests] = useState({ requests: [], reports: [] });

  const refreshMyRequests = useCallback(() => {
    if (!guest?.stayId) return;
    Promise.all([
      stayApi.listServiceRequests(guest.stayId).catch(() => ({ requests: [] })),
      stayApi.listMaintenanceReports(guest.stayId).catch(() => ({ reports: [] })),
    ]).then(([sr, mr]) => setMyRequests({ requests: sr.requests || [], reports: mr.reports || [] }));
  }, [guest?.stayId]);

  useEffect(() => {
    refreshMyRequests();
    const interval = setInterval(refreshMyRequests, 8000);
    return () => clearInterval(interval);
  }, [refreshMyRequests]);

  // Événements temps réel poussés vers le PMS + backend réel
  const pushTicket = async (req, priority = "MED", price = 0) => {
    setAppState(prev => ({
      ...prev,
      liveTickets: [{ id: `lt_${Date.now()}`, guestId, guest: `${guest?.firstName} ${guest?.lastName}`, room, req, priority, time: "À l'instant", live: true }, ...(prev.liveTickets || [])],
    }));
    if (!guest?.stayId) return;
    setActionError(null);
    try {
      await stayApi.requestService(guest.stayId, req, priority, price);
      refreshMyRequests();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Erreur réseau, veuillez réessayer");
    }
  };

  const pushMaintenance = async (report) => {
    setAppState(prev => ({
      ...prev,
      liveMaintenance: [{ id: `lm_${Date.now()}`, guestId, room, issue: report.issue, brand: report.equipment, parts: [], eta: "2h30", priority: "HIGH", ticket: report.ticket, live: true }, ...(prev.liveMaintenance || [])],
    }));
    if (!guest?.stayId) return;
    setActionError(null);
    try {
      await stayApi.reportMaintenance(guest.stayId, report.issue, report.equipment);
      refreshMyRequests();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Erreur réseau, veuillez réessayer");
    }
  };

  return {
    myRequests, refreshMyRequests,
    pushTicket, pushMaintenance,
    actionError, setActionError, actionSubmitting, setActionSubmitting,
  };
}
