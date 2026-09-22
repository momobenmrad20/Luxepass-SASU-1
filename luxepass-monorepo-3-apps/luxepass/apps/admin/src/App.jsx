import { RefreshCw } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import { I18nProvider } from "@shared/contexts/I18nContext";
import { AuthProvider } from "@shared/contexts/AuthContext";
import { AppStateProvider } from "@shared/contexts/AppStateContext";
import { useI18n } from "@shared/hooks/useI18n";
import { useAppState } from "@shared/hooks/useAppState";

import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { useAdminAuth } from "./hooks/useAdminAuth";
import AdminLoginScreen from "./components/AdminLoginScreen";
import SuperAdmin from "./components/screens/SuperAdmin";

// URL de l'app PMS, séparée depuis le split (défaut = dev local, port 5174).
const PMS_APP_URL = import.meta.env.VITE_PMS_APP_URL || "http://localhost:5174";

// ─────────────────────────────────────────────────────────────
// App.jsx (apps/admin) — équivalent, pour admin.luxepass.com, du branch
// role === "admin" de l'ancien AppShell. Deux différences volontaires :
//
// 1. AJOUT d'une vraie authentification (AdminAuthProvider +
//    AdminLoginScreen) — l'ancien rôle "admin" de la SPA unique n'en avait
//    AUCUNE (cf. le document d'architecture, §1 et §15).
// 2. onOpenPMS n'assigne plus un état local (impossible entre deux
//    déploiements séparés) : il ouvre pms.luxepass.com dans un nouvel
//    onglet. Le staff devra s'y connecter normalement avec ses identifiants
//    — l'admin ne peut plus "prévisualiser" un PMS sans passer par l'auth
//    staff réelle, ce qui est plus correct côté sécurité.
// ─────────────────────────────────────────────────────────────
export default function AdminApp() {
  return (
    <I18nProvider>
      <AuthProvider>
        <AppStateProvider initialRole="admin">
          <AdminAuthProvider>
            <AdminShell />
          </AdminAuthProvider>
        </AppStateProvider>
      </AuthProvider>
    </I18nProvider>
  );
}

function AdminShell() {
  const { lang, setLang, isRTL } = useI18n();
  const { adminAuth, adminRestoring } = useAdminAuth();
  const { partnerHotels, persistPartnerHotels, allAdminHotels, allClientHotels } = useAppState();

  const langs = [
    { key: "fr", label: "FR" },
    { key: "en", label: "EN" },
    { key: "ar", label: "ع" },
  ];

  const handleOpenPMS = (hotel) => {
    window.open(`${PMS_APP_URL}/?hotelId=${encodeURIComponent(hotel.id)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen text-white" style={{ background: "#080808", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="sticky top-0 z-50 border-b" style={{ background: "rgba(5,5,5,0.97)", backdropFilter: "blur(24px)", borderColor: "rgba(212,175,55,0.12)" }}>
        <div className="flex items-center justify-end px-3 py-2 gap-2">
          <div className="flex gap-1 flex-shrink-0">
            {langs.map(l => (
              <button key={l.key} onClick={() => setLang(l.key)}
                className="w-8 h-7 rounded-lg text-xs font-bold transition-all"
                style={lang === l.key ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!adminAuth && adminRestoring && (
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#080808" }}>
          <RefreshCw size={22} className="animate-spin" style={{ color: gold }} />
        </div>
      )}
      {!adminAuth && !adminRestoring && <AdminLoginScreen />}
      {adminAuth && (
        <SuperAdmin
          partnerHotels={partnerHotels}
          persistPartnerHotels={persistPartnerHotels}
          allAdminHotels={allAdminHotels}
          allClientHotels={allClientHotels}
          onOpenPMS={handleOpenPMS}
          currentPMSHotelId={null}
        />
      )}
    </div>
  );
}
