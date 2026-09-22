// @ts-check
import { useEffect, useRef } from "react";
import { stayApi, setClientStay, getClientStay, STAY_AUTH_LOST_EVENT } from "../api/apiClient";
import { encodeQrPayload } from "../api/qrPayload";
import { HOTELS, createDefaultAppState } from "../constants";
import { useAuth } from "./useAuth";
import { useAppState } from "./useAppState";

/**
 * Séjour client : restauration après rechargement de page + réaction à la
 * perte de session de séjour. À appeler UNE fois (dans l'AppShell).
 * Extrait tel quel de LuxePassApp.
 */
export function useStay() {
  const { setClientRestoring, clearClientStay } = useAuth();
  const {
    allClientHotels, selectedHotel, setSelectedHotel, setAppStateByHotel,
    setRole, setScreen, setStayNotice,
  } = useAppState();

  // Restauration du séjour client après rechargement de page (P1 §2.1) :
  // si un stayId est en localStorage (posé par CheckInFlow à la fin du
  // check-in), on rappelle GET /stays/:stayId/pass pour reconstituer un
  // guest minimal (nom, chambre, QR frais) sans repasser par le check-in.
  // En cas de séjour clôturé (checked_out) ou d'introuvable (404/410), on
  // efface la clé et on laisse l'écran d'accueil s'afficher normalement.
  useEffect(() => {
    const saved = getClientStay();
    if (!saved?.stayId) return;
    let cancelled = false;
    (async () => {
      try {
        const pass = await stayApi.getPass(saved.stayId);
        if (cancelled) return;
        if (pass.status === "checked_out") {
          clearClientStay();
          return;
        }
        const restoredHotel = allClientHotels.find(h => h.id === saved.hotelId) || HOTELS[0];
        const [firstName, ...rest] = (pass.guestName || "").split(" ");
        const qrPayload = encodeQrPayload({ stayId: pass.stayId, qrToken: pass.qrToken });
        // /pass renvoie un stayToken frais (null si le séjour est clos) : on le
        // garde, sinon on conserve l'ancien.
        const restoredStayToken = pass.stayToken || saved.stayToken;
        setClientStay({
          stayId: pass.stayId,
          qrToken: pass.qrToken,
          hotelId: restoredHotel.id,
          stayToken: restoredStayToken,
        });

        setSelectedHotel(restoredHotel);
        setAppStateByHotel(prev => {
          const current = prev[restoredHotel.id] || createDefaultAppState();
          return {
            ...prev,
            [restoredHotel.id]: {
              ...current,
              guest: {
                ...(current.guest || {}),
                firstName: firstName || "",
                lastName: rest.join(" "),
                hotel: restoredHotel,
                stayId: pass.stayId,
                qrToken: pass.qrToken,
                stayToken: restoredStayToken,
                qrPayload,
                room: pass.room,
                guestId: current.guest?.guestId || `g_${pass.stayId}`,
              },
            },
          };
        });
        setRole("client");
        setScreen("dashboard");
      } catch (err) {
        // Séjour introuvable/clôturé (404/410) : on nettoie la clé. Sur une
        // simple erreur réseau (status 0, backend injoignable au
        // démarrage), on la laisse en place pour retenter au prochain
        // montage plutôt que de faire perdre le séjour au client.
        if (!cancelled && err?.status !== 0) clearClientStay();
      } finally {
        if (!cancelled) setClientRestoring(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Séjour client perdu (stayToken absent, expiré ou refusé — 401/403 — par le
  // backend) : apiClient a déjà effacé les clés locales. On retire le guest de
  // l'état, on affiche le message « Session de séjour expirée ou invalide » et
  // on renvoie le client à l'écran de check-in de son hôtel (à l'accueil si
  // aucun hôtel n'est encore sélectionné), plutôt que de laisser un dashboard
  // dont toutes les requêtes échouent en silence (les polling font
  // .catch(() => {})). Le ref évite de capturer un selectedHotel périmé.
  const selectedHotelRef = useRef(null);
  selectedHotelRef.current = selectedHotel;
  useEffect(() => {
    const onStayAuthLost = () => {
      setAppStateByHotel(prev =>
        Object.fromEntries(Object.entries(prev).map(([hotelId, st]) => [hotelId, { ...st, guest: null }]))
      );
      setStayNotice(true);
      setScreen(selectedHotelRef.current ? "checkin" : "home");
    };
    window.addEventListener(STAY_AUTH_LOST_EVENT, onStayAuthLost);
    return () => window.removeEventListener(STAY_AUTH_LOST_EVENT, onStayAuthLost);
  }, []);
}
