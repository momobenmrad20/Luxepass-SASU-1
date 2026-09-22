import { RefreshCw, ChevronRight } from "lucide-react";
import { HOTELS } from "@shared/constants";
import { gold } from "@shared/components/common/theme";
import GoldButton from "@shared/components/common/GoldButton";
import { I18nProvider } from "@shared/contexts/I18nContext";
import { AuthProvider } from "@shared/contexts/AuthContext";
import { AppStateProvider } from "@shared/contexts/AppStateContext";
import { useI18n } from "@shared/hooks/useI18n";
import { useAuth } from "@shared/hooks/useAuth";
import { useAppState } from "@shared/hooks/useAppState";
import { useStay } from "@shared/hooks/useStay";

import HomeScreen from "./components/screens/HomeScreen";
import CheckInFlow from "./components/checkin/CheckInFlow";
import ClientDashboard from "./components/client/ClientDashboard";

// ─────────────────────────────────────────────────────────────
// App.jsx (apps/client) — équivalent, pour app.luxepass.com, du seul
// branch role === "client" de l'ancien AppShell (LuxePass.jsx). Même
// logique, mêmes contextes, juste sans le sélecteur de rôle (ce bundle
// ne contient plus jamais HotelPMS ni SuperAdmin).
// ─────────────────────────────────────────────────────────────
export default function ClientApp() {
  return (
    <I18nProvider>
      <AuthProvider>
        <AppStateProvider initialRole="client">
          <ClientShell />
        </AppStateProvider>
      </AuthProvider>
    </I18nProvider>
  );
}

function ClientShell() {
  const { lang, setLang, t, isRTL } = useI18n();
  const { clientRestoring, clearClientStay } = useAuth();
  const {
    screen, setScreen, stayNotice, setStayNotice, selectedHotel,
    appState, allClientHotels, selectHotel, completeCheckIn,
  } = useAppState();

  // Restauration du séjour client + réaction à la perte de session de séjour.
  useStay();

  const langs = [
    { key: "fr", label: "FR" },
    { key: "en", label: "EN" },
    { key: "ar", label: "ع" },
  ];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen text-white" style={{ background: "#080808", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* LANGUAGE SWITCHER BAR (le sélecteur de rôle a disparu : cette app EST le client) */}
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

      {stayNotice && screen !== "dashboard" && (
        <div role="alert" className="mx-3 mt-3 px-4 py-3 rounded-xl flex items-start justify-between gap-3 text-sm"
          style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.35)", color: "#fca5a5" }}>
          <span>{t.stayExpired}</span>
          <button onClick={() => setStayNotice(false)} aria-label="Fermer" className="flex-shrink-0 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}
      {screen === "home" && !clientRestoring && <HomeScreen onSelectHotel={selectHotel} hotels={allClientHotels} />}
      {screen === "checkin" && selectedHotel && (
        <CheckInFlow hotel={selectedHotel} onComplete={completeCheckIn} />
      )}
      {screen === "dashboard" && appState.guest && (
        <ClientDashboard guest={appState.guest} hotel={selectedHotel || HOTELS[0]} onLeaveStay={clearClientStay} />
      )}
      {screen === "home" && clientRestoring && (
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#080808" }}>
          <RefreshCw size={22} className="animate-spin" style={{ color: gold }} />
        </div>
      )}
      {screen === "dashboard" && !appState.guest && !clientRestoring && (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
          <div className="text-center">
            <p className="text-white/50 mb-4">Veuillez d'abord compléter votre check-in.</p>
            <GoldButton onClick={() => setScreen(selectedHotel ? "checkin" : "home")}>
              {t.checkIn} <ChevronRight size={16} />
            </GoldButton>
          </div>
        </div>
      )}
    </div>
  );
}
