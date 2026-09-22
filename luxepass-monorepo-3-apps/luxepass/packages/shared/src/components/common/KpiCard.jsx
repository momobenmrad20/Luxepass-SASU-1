import { gold } from "./theme";
import GlassCard from "./GlassCard";

// Extrait tel quel de LuxePass.jsx (lignes 1390-1406 d'origine) — aucun
// changement de logique, de props ou de nom.
export default function KpiCard({ icon: Icon, label, value, sub, trend }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-xl" style={{ background: "rgba(212,175,55,0.1)" }}>
          <Icon size={20} style={{ color: gold }} />
        </div>
        {trend && <span className={`text-xs font-semibold ${trend > 0 ? "text-emerald-400" : "text-red-400"}`}>
          {trend > 0 ? "+" : ""}{trend}%
        </span>}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-white/50 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </GlassCard>
  );
}
