import { RefreshCw } from "lucide-react";
import { HOTELS } from "@shared/constants";
import { gold } from "@shared/components/common/theme";
import { I18nProvider } from "@shared/contexts/I18nContext";
import { AuthProvider } from "@shared/contexts/AuthContext";
import { AppStateProvider } from "@shared/contexts/AppStateContext";
import { LiveFeedProvider } from "@shared/contexts/LiveFeedContext";
import { useI18n } from "@shared/hooks/useI18n";
import { useAuth } from "@shared/hooks/useAuth";
import { useAppState } from "@shared/hooks/useAppState";

import StaffLoginScreen from "./components/staff/StaffLoginScreen";
import HotelPMS from "./components/staff/HotelPMS";

// ─────────────────────────────────────────────────────────────
// App.jsx (apps/pms) — équivalent, pour pms.luxepass.com, du seul branch
// role === "pms" de l'ancien AppShell (LuxePass.jsx). Ce bundle ne contient
// plus jamais le code client ni SuperAdmin.
//
// Différence volontaire par rapport à l'ancien code : l'hôtel affiché n'est
// plus "selectedHotel || HOTELS[0]" (qui ne reflétait le vrai hôtel du
// staff que si on arrivait via le bouton "Ouvrir PMS" du Super Admin dans
// l'ancienne SPA unique — impossible maintenant que c'est un déploiement
// séparé). Il est désormais dérivé de staffHotelId, renvoyé par la session
// (GET /auth/me), ce qui est plus correct : chaque staff voit son propre
// hôtel dès la connexion, sans dépendre d'un état partagé avec l'admin.
// ─────────────────────────────────────────────────────────────
export default function PmsApp() {
  return (
    <I18nProvider>
      <AuthProvider>
        <AppStateProvider initialRole="pms">
          <LiveFeedProvider>
            <PmsShell />
          </LiveFeedProvider>
        </AppStateProvider>
      </AuthProvider>
    </I18nProvider>
  );
}

function PmsShell() {
  const { lang, setLang, isRTL } = useI18n();
  const { staffAuth, staffHotelId, staffRestoring } = useAuth();
  useAppState(); // initialise l'état PMS (usePmsState) pour l'hôtel courant

  const currentHotel = HOTELS.find(h => h.id === staffHotelId) || HOTELS[0];

  const langs = [
    { key: "fr", label: "FR" },
    { key: "en", label: "EN" },
    { key: "ar", label: "ع" },
  ];

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

      {!staffAuth && staffRestoring && (
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#080808" }}>
          <RefreshCw size={22} className="animate-spin" style={{ color: gold }} />
        </div>
      )}
      {!staffAuth && !staffRestoring && <StaffLoginScreen />}
      {staffAuth && <HotelPMS hotel={currentHotel} />}
    </div>
  );
}
