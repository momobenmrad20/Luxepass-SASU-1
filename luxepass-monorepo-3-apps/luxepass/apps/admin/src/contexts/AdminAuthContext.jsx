// @ts-check
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { staffAuthApi } from "@shared/api/apiClient";

// ─────────────────────────────────────────────────────────────
// AdminAuthContext — NOUVEAU (créé lors du split en 3 apps).
//
// Avant le split, le rôle "admin" de LuxePass.jsx n'avait AUCUNE
// authentification : cliquer sur le bouton "Super Admin" affichait
// directement <SuperAdmin /> à n'importe quel visiteur. Ce contexte
// corrige ça pour l'app admin.luxepass.com.
//
// Réutilise le même mécanisme que l'auth staff (cookies HttpOnly,
// GET /auth/me, POST /auth/login, POST /auth/logout — cf.
// packages/shared/src/api/apiClient.js) : PAS un nouveau système
// d'auth, juste un rôle de plus. Condition supplémentaire ici :
// seul un compte dont staff.role === "SUPER_ADMIN" est accepté ;
// tout autre rôle (staff d'un hôtel) est refusé et déconnecté.
//
// ⚠️ Le vrai verrou de sécurité doit exister CÔTÉ BACKEND : le rôle
// SUPER_ADMIN doit exister dans luxepass-backend, et toutes les
// routes /admin/* doivent vérifier ce rôle server-side (RLS / middleware).
// Ce contexte ne fait qu'empêcher un compte staff normal d'utiliser
// cette interface — ce n'est pas une garantie de sécurité à lui seul.
// ─────────────────────────────────────────────────────────────
export const AdminAuthContext = createContext(null);

const REQUIRED_ROLE = "SUPER_ADMIN";

export function AdminAuthProvider({ children }) {
  const [adminAuth, setAdminAuth] = useState(null); // { staff: { id, email, role, hotelId } }
  const [adminRestoring, setAdminRestoring] = useState(true);
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { staff } = await staffAuthApi.me();
        if (cancelled) return;
        if (staff?.role === REQUIRED_ROLE) {
          setAdminAuth({ staff });
        } else {
          // Session valide mais pas un compte Super Admin : on ne
          // garde pas cette session côté admin.
          setAdminAuth(null);
        }
      } catch (e) {
        if (cancelled) return;
        setAdminAuth(null);
      } finally {
        if (!cancelled) setAdminRestoring(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email, password) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const { staff } = await staffAuthApi.login(email, password);
      if (staff?.role !== REQUIRED_ROLE) {
        await staffAuthApi.logout();
        setLoginError("Ce compte n'a pas les droits Super Admin.");
        setAdminAuth(null);
        return;
      }
      setAdminAuth({ staff });
    } catch (e) {
      setLoginError(e.message || "Connexion impossible");
    } finally {
      setLoginLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await staffAuthApi.logout();
    setAdminAuth(null);
  }, []);

  const value = useMemo(() => ({
    adminAuth, adminRestoring, loginError, loginLoading, login, logout,
  }), [adminAuth, adminRestoring, loginError, loginLoading, login, logout]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
