// @ts-check
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { connectLiveFeed, pmsApi, staffApi } from "../api/apiClient";
import { useAuth } from "../hooks/useAuth";

// ─────────────────────────────────────────────────────────────
// LiveFeedContext — données réelles du PMS (backend) côté staff.
//
// digitalLiveFeed (tickets/maintenance/commandes/notes) est alimenté en
// temps réel par connectLiveFeed() (SSE) — plus par polling.
// active-stays/folios/pending-stays restent en polling REST classique : le
// flux SSE ne couvre que le live-feed du hall (cf. docs/tasks/REALTIME_FEED.md
// §6 côté backend).
//
// Extrait tel quel de LuxePassApp (LuxePass.jsx). Quand la session staff
// prend fin (staffToken → null), tout est remis à zéro ici même.
// ─────────────────────────────────────────────────────────────
export const LiveFeedContext = createContext(null);

const EMPTY_LIVE_FEED = { tickets: [], maintenance: [], orders: [], notes: [] };
const EMPTY_FOLIOS = { folios: [], grandTotal: 0 };

// Fusionne un événement SSE individuel (voir connectLiveFeed dans
// api/apiClient.js) dans l'état local digitalLiveFeed : upsert par id pour
// les tickets/maintenance/commandes (créé OU mis à jour → même logique),
// simple ajout en tête pour les notes (pas de "note.updated" côté
// backend). stay.completed/stay.checked_out ne touchent aucun tableau
// ici — ces événements concernent digitalActiveStays/digitalPendingStays,
// rafraîchis via refreshPmsSideData() après les actions qui les déclenchent.
function upsertLiveFeedEvent(prev, type, data) {
  const upsertById = (list) => {
    const idx = list.findIndex((item) => item.id === data.id);
    if (idx === -1) return [data, ...list];
    const next = [...list];
    next[idx] = data;
    return next;
  };

  switch (type) {
    case "service_request.created":
    case "service_request.updated":
      return { ...prev, tickets: upsertById(prev.tickets || []) };
    case "maintenance.created":
    case "maintenance.updated":
      return { ...prev, maintenance: upsertById(prev.maintenance || []) };
    case "order.created":
    case "order.updated":
      return { ...prev, orders: upsertById(prev.orders || []) };
    case "note.added":
      return { ...prev, notes: [data, ...(prev.notes || [])] };
    default:
      return prev;
  }
}

export function LiveFeedProvider({ children }) {
  const { staffToken, staffHotelId, logoutStaff } = useAuth();

  const [digitalLiveFeed, setDigitalLiveFeed] = useState(EMPTY_LIVE_FEED);
  const [digitalActiveStays, setDigitalActiveStays] = useState([]);
  const [digitalFolios, setDigitalFolios] = useState(EMPTY_FOLIOS);
  const [digitalPendingStays, setDigitalPendingStays] = useState([]);
  const [liveFeedConnected, setLiveFeedConnected] = useState(false);

  const refreshPmsSideData = useCallback(async () => {
    if (!staffToken || !staffHotelId) return;
    try {
      const [stays, folios, pending] = await Promise.all([
        pmsApi.activeStays(staffHotelId),
        pmsApi.folios(staffHotelId),
        staffApi.pendingStays(staffHotelId),
      ]);
      setDigitalActiveStays(stays.stays || []);
      setDigitalFolios(folios);
      setDigitalPendingStays(pending.stays || []);
    } catch (e) {
      // Token expiré/invalide ou backend injoignable — on redemande la connexion
      if (e.status === 401) logoutStaff();
    }
  }, [staffToken, staffHotelId, logoutStaff]);

  // Poll toutes les 6s tant qu'on est connecté côté staff — seulement
  // pour active-stays/folios/pending-stays (le live-feed est en SSE, ci-dessous).
  useEffect(() => {
    if (!staffToken || !staffHotelId) return;
    refreshPmsSideData();
    const interval = setInterval(refreshPmsSideData, 6000);
    return () => clearInterval(interval);
  }, [staffToken, staffHotelId]);

  // Live-feed du hall (tickets/maintenance/commandes/notes) en temps réel
  // via SSE — reconnexion automatique gérée par connectLiveFeed() en cas
  // de coupure (voir apiClient.js pour le détail des 4 étapes).
  useEffect(() => {
    if (!staffToken || !staffHotelId) return;
    setLiveFeedConnected(false);

    const disconnect = connectLiveFeed(staffHotelId, {
      onSnapshot: (snapshot) => {
        setDigitalLiveFeed({
          tickets: snapshot.tickets || [],
          maintenance: snapshot.maintenance || [],
          orders: snapshot.orders || [],
          notes: snapshot.notes || [],
        });
        setLiveFeedConnected(true);
      },
      onItemUpdate: (type, data) => {
        setLiveFeedConnected(true);
        setDigitalLiveFeed((prev) => upsertLiveFeedEvent(prev, type, data));
      },
      onError: () => {
        setLiveFeedConnected(false);
      },
    });

    return () => disconnect();
  }, [staffToken, staffHotelId]);

  // Fin de session staff (déconnexion volontaire ou 401) : le SSE se ferme via
  // le cleanup ci-dessus ; on remet à zéro les données affichées, sinon elles
  // resteraient à l'écran à la reconnexion suivante.
  const wasStaffAuthed = useRef(false);
  useEffect(() => {
    if (staffToken) { wasStaffAuthed.current = true; return; }
    if (!wasStaffAuthed.current) return;
    wasStaffAuthed.current = false;
    setDigitalLiveFeed(EMPTY_LIVE_FEED);
    setDigitalActiveStays([]);
    setDigitalFolios(EMPTY_FOLIOS);
    setDigitalPendingStays([]);
    setLiveFeedConnected(false);
  }, [staffToken]);

  const value = useMemo(() => ({
    digitalLiveFeed, liveFeedConnected,
    digitalActiveStays, digitalFolios, digitalPendingStays,
    refreshPmsSideData,
  }), [digitalLiveFeed, liveFeedConnected, digitalActiveStays, digitalFolios,
       digitalPendingStays, refreshPmsSideData]);

  return <LiveFeedContext.Provider value={value}>{children}</LiveFeedContext.Provider>;
}
