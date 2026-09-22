// @ts-check
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { HOTELS, ADMIN_HOTELS, PARTNER_HOTELS_KEY } from "../constants";
import { useI18n } from "../hooks/useI18n";
import { usePmsState } from "../hooks/usePmsState";

// ─────────────────────────────────────────────────────────────
// AppStateContext — navigation / UI globale (rôle, écran, hôtel sélectionné,
// hôtels partenaires) + état PMS de l'hôtel courant (appState / setAppState,
// voir hooks/usePmsState.js).
//
// La langue vit dans I18nContext ; la session staff dans AuthContext ;
// le temps réel dans LiveFeedContext.
// ─────────────────────────────────────────────────────────────
export const AppStateContext = createContext(null);

// `initialRole` : ajouté lors du split en 3 apps (client/pms/admin déployées
// séparément). Chaque app fixe son propre rôle dès le départ (au lieu du
// sélecteur de rôle de l'ancienne SPA unique). Défaut inchangé ("client")
// pour ne rien casser d'existant.
export function AppStateProvider({ children, initialRole = "client" }) {
  const { lang } = useI18n();
  const [role, setRole] = useState(initialRole);
  const [screen, setScreen] = useState("home"); // home | checkin | dashboard
  // Bandeau « Session de séjour expirée ou invalide » (cf. STAY_AUTH_LOST_EVENT).
  const [stayNotice, setStayNotice] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [partnerHotels, setPartnerHotels] = useState([]);
  const [storageAvailable, setStorageAvailable] = useState(true);

  // Chargement des hôtels partenaires persistés.
  // ⚠️ Pas d'équivalent backend pour cette liste (pas de route "créer un
  // hôtel partenaire" côté luxepass-backend — c'est une fonctionnalité
  // Super Admin locale) : contrairement à pms_state, elle reste
  // en localStorage du navigateur, PAS partagée entre appareils/staff.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PARTNER_HOTELS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      setPartnerHotels(Array.isArray(list) ? list : []);
    } catch (e) {
      // Clé absente au premier lancement, ou localStorage indisponible
      // (navigation privée stricte, quota dépassé...)
      setStorageAvailable(false);
    }
  }, []);

  // Persiste la liste complète des hôtels partenaires (state local + localStorage)
  const persistPartnerHotels = useCallback((nextList) => {
    setPartnerHotels(nextList);
    try {
      localStorage.setItem(PARTNER_HOTELS_KEY, JSON.stringify(nextList));
    } catch (e) {
      setStorageAvailable(false);
    }
  }, []);

  const allClientHotels = useMemo(() => [...HOTELS, ...partnerHotels], [partnerHotels]);
  const allAdminHotels = useMemo(() => [...ADMIN_HOTELS, ...partnerHotels.map(h => ({
    id: h.id, name: h.name, guests: h.guests ?? 0, mrr: h.mrr ?? 0,
    status: h.status || "pending", modules: h.modules || ["checkin"],
  }))], [partnerHotels]);

  const currentHotelId = selectedHotel?.id || HOTELS[0].id;
  const { appState, setAppState, setAppStateByHotel } = usePmsState({ currentHotelId, role, lang });

  // Actions de navigation
  const selectHotel = useCallback((hotel) => {
    setSelectedHotel(hotel);
    setScreen("checkin");
  }, []);

  const completeCheckIn = useCallback(() => {
    setStayNotice(false);
    setScreen("dashboard");
  }, []);

  // Bascule vers le rôle PMS scopé sur un hôtel donné (utilisé depuis Super Admin)
  const openHotelPMS = useCallback((hotel) => {
    setSelectedHotel(hotel);
    setRole("pms");
  }, []);

  const value = useMemo(() => ({
    role, setRole, screen, setScreen, stayNotice, setStayNotice,
    selectedHotel, setSelectedHotel, currentHotelId,
    partnerHotels, persistPartnerHotels, allClientHotels, allAdminHotels, storageAvailable,
    appState, setAppState, setAppStateByHotel,
    selectHotel, completeCheckIn, openHotelPMS,
  }), [role, screen, stayNotice, selectedHotel, currentHotelId, partnerHotels, persistPartnerHotels,
       allClientHotels, allAdminHotels, storageAvailable, appState, setAppState, setAppStateByHotel,
       selectHotel, completeCheckIn, openHotelPMS]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
