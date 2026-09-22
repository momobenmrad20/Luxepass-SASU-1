// @ts-check
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { staffAuthApi, getClientStay, clearClientStay } from "../api/apiClient";

// ─────────────────────────────────────────────────────────────
// AuthContext — session staff (cookie HttpOnly, via GET /auth/me) et
// drapeau de restauration du séjour client.
//
// Extrait tel quel de LuxePassApp (LuxePass.jsx) — même logique :
//  • le jeton staff vit dans un cookie HttpOnly (illisible en JS) : on part
//    toujours de staffRestoring=true et GET /auth/me tranche ;
//  • `staffToken` reste un simple booléen « session staff active » ;
//  • `clientRestoring` reste vrai tant que la restauration du séjour client
//    (hooks/useStay.js) n'a pas répondu, si un séjour est en localStorage.
//
// Les données que la déconnexion doit remettre à zéro (live feed, état PMS
// distant) se réinitialisent elles-mêmes quand `staffToken` retombe à null
// (voir LiveFeedContext et hooks/usePmsState.js).
// ─────────────────────────────────────────────────────────────
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [staffAuth, setStaffAuth] = useState(null); // { staff: { hotelId, email, role } }
  const [staffLoginError, setStaffLoginError] = useState(null);
  const [staffLoginLoading, setStaffLoginLoading] = useState(false);
  // true tant que GET /auth/me n'a pas répondu.
  const [staffRestoring, setStaffRestoring] = useState(true);
  // true tant que GET /stays/:stayId/pass n'a pas répondu, quand un séjour
  // client est déjà en localStorage (cf. setClientStay dans CheckInFlow).
  const [clientRestoring, setClientRestoring] = useState(() => !!getClientStay());

  // Restauration de la session staff après un rechargement de page.
  // GET /auth/me est toujours tenté : le cookie staff_session (ou
  // staff_refresh, via le refresh automatique dans apiFetch) est rejoué
  // par le navigateur s'il existe, sinon la requête échoue simplement en
  // 401 — cas normal d'un visiteur non connecté, pas une erreur à traiter.
  // Exception : status 0 (backend injoignable) — on n'appelle pas
  // /auth/logout pour une simple coupure réseau.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { staff } = await staffAuthApi.me();
        if (cancelled) return;
        setStaffAuth({ staff });
      } catch (e) {
        if (cancelled) return;
        if (e?.status !== 0 && e?.status !== 401) staffAuthApi.logout();
        setStaffAuth(null);
      } finally {
        if (!cancelled) setStaffRestoring(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loginStaff = useCallback(async (email, password) => {
    setStaffLoginLoading(true);
    setStaffLoginError(null);
    try {
      const res = await staffAuthApi.login(email, password);
      setStaffAuth(res); // { staff }
    } catch (e) {
      setStaffLoginError(e.message || "Connexion impossible");
    } finally {
      setStaffLoginLoading(false);
    }
  }, []);

  // Déconnexion staff complète : demande au backend d'effacer les cookies
  // staff_session/staff_refresh (un cookie HttpOnly ne peut pas être effacé
  // depuis le front), puis remet à zéro l'état d'auth. L'état local est
  // remis à zéro même si l'appel réseau échoue (cf. staffAuthApi.logout).
  const logoutStaff = useCallback(async () => {
    await staffAuthApi.logout();
    setStaffAuth(null);
    setStaffLoginError(null);
  }, []);

  const staffHotelId = staffAuth?.staff?.hotelId || null;
  const staffToken = staffAuth?.staff ? true : null;

  const value = useMemo(() => ({
    staffAuth, staffHotelId, staffToken, staffRestoring,
    staffLoginError, staffLoginLoading, loginStaff, logoutStaff,
    clientRestoring, setClientRestoring, clearClientStay,
  }), [staffAuth, staffHotelId, staffToken, staffRestoring, staffLoginError, staffLoginLoading,
       loginStaff, logoutStaff, clientRestoring]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
