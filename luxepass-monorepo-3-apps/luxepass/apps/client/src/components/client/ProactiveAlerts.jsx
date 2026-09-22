import { useState } from "react";
import { Cloud, Plane, X, Zap } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import { PROACTIVE_EVENTS } from "@shared/constants";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// MODULE 3 — ALERTES PROACTIVES (météo, vol, événements)
// ─────────────────────────────────────────────────────────────
export default function ProactiveAlerts() {
  const { t, lang } = useI18n();
  const [dismissed, setDismissed] = useState([]);
  const visible = PROACTIVE_EVENTS.filter(e => !dismissed.includes(e.id));
  if (!visible.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Zap size={14} style={{ color: gold }} />
        <span className="text-xs font-semibold uppercase tracking-wider text-white/50">{t.proactiveTitle}</span>
      </div>
      {visible.map(ev => (
        <GlassCard key={ev.id} className="p-4 flex items-start gap-3" style={{ borderColor: "rgba(212,175,55,0.2)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,175,55,0.1)" }}>
            {ev.icon === "weather" ? <Cloud size={16} style={{ color: gold }} /> : <Plane size={16} style={{ color: gold }} />}
          </div>
          <div className="flex-1">
            <p className="text-sm text-white/80 leading-relaxed">{ev[lang] || ev.fr}</p>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={() => setDismissed(p => [...p, ev.id])}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "rgba(212,175,55,0.15)", color: gold }}>
                {ev[`cta_${lang}`] || ev.cta_fr}
              </button>
              <button onClick={() => setDismissed(p => [...p, ev.id])} className="text-xs text-white/30 px-2">
                <X size={12} />
              </button>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
