import { BarChart3, DollarSign, TrendingUp, Users } from "lucide-react";
import { gold, goldDark } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import KpiCard from "@shared/components/common/KpiCard";
import { COMP_SET, FORECAST_7D } from "@shared/constants";
import { useAppState } from "@shared/hooks/useAppState";
import { useI18n } from "@shared/hooks/useI18n";
import { useLiveFeed } from "@shared/hooks/useLiveFeed";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// MODULE 9 — REPORTING (ADR, RevPAR, forecast, STR comp set)
// ─────────────────────────────────────────────────────────────
export default function ReportingDashboard({ hotel }) {
  const { t } = useI18n();
  const { appState } = useAppState();
  const { digitalActiveStays, digitalFolios } = useLiveFeed();
  const maxOcc = Math.max(...FORECAST_7D.map(d => d.occ));
  const maxComp = Math.max(...COMP_SET.map(c => c.adr));
  const inHouseCount = digitalActiveStays.filter(s => s.stage === "completed").length;

  return (
    <div className="space-y-5">
      {/* KPIs réels (séjours digitaux) */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard icon={Users} label="Séjours digitaux actifs" value={inHouseCount} />
        <KpiCard icon={DollarSign} label="CA digital cumulé" value={`${digitalFolios.grandTotal?.toFixed(0) || 0} ${hotel.currencySymbol}`} />
      </div>
      {/* Le reste ci-dessous reste indicatif (marché/concurrence — aucune donnée
          externe réelle n'est intégrée en Phase 0 : pas de connecteur STR/Booking). */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard icon={DollarSign} label="ADR" value="342 DT" trend={4} />
        <KpiCard icon={TrendingUp} label="RevPAR" value="298 DT" trend={6} />
        <KpiCard icon={Users} label="Occupation moy. 7j" value="83%" trend={2} />
        <KpiCard icon={BarChart3} label="Segment Affaires" value="42%" sub="31% loisirs, 27% résidents" />
      </div>

      <div>
        <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2">Prévision d'occupation — 7 jours</h4>
        <GlassCard className="p-4">
          <div className="flex items-end justify-between gap-2 h-28">
            {FORECAST_7D.map(d => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-md" style={{ height: `${(d.occ / maxOcc) * 90}px`, background: `linear-gradient(180deg, ${gold}, ${goldDark})` }} />
                <p className="text-white/40 text-[10px]">{d.day}</p>
                <p className="text-white text-[10px] font-bold">{d.occ}%</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div>
        <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2">Comparaison marché (STR Comp Set)</h4>
        <div className="space-y-2">
          {COMP_SET.map(c => (
            <GlassCard key={c.name} className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className={`text-xs font-medium ${c.name === "Notre hôtel" ? "" : "text-white/60"}`} style={c.name === "Notre hôtel" ? { color: gold } : {}}>{c.name}</p>
                <p className="text-white/50 text-[10px]">ADR {c.adr} • RevPAR {c.revpar}</p>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(c.adr / maxComp) * 100}%`, background: c.name === "Notre hôtel" ? gold : "rgba(255,255,255,0.25)" }} />
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
