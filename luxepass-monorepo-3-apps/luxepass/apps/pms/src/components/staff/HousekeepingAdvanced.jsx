import { ClipboardCheck } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import { HOUSEKEEPING_STAFF, ROOMS_STATUS, ROOM_DETAIL_STATUS } from "@shared/constants";
import { useAppState } from "@shared/hooks/useAppState";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// MODULE 5 — HOUSEKEEPING AVANCÉ
// ─────────────────────────────────────────────────────────────
export default function HousekeepingAdvanced() {
  const { t } = useI18n();
  const { appState, setAppState } = useAppState();
  const detail = appState.roomDetailStatus || ROOM_DETAIL_STATUS;
  const rooms = appState.rooms || ROOMS_STATUS;

  const statusCfg = {
    ready: { label: "Propre", color: "#34d399" },
    dirty: { label: "Sale", color: "#f87171" },
    cleaning: { label: "En nettoyage", color: "#fbbf24" },
    inspected: { label: "Inspectée", color: gold },
    out_of_order: { label: "Hors service", color: "#94a3b8" },
  };

  const assign = (roomId, staff) => setAppState(prev => ({
    ...prev,
    roomDetailStatus: { ...(prev.roomDetailStatus || ROOM_DETAIL_STATUS), [roomId]: { ...(prev.roomDetailStatus?.[roomId] || {}), assignedTo: staff } },
  }));

  const markInspected = (roomId) => setAppState(prev => ({
    ...prev,
    roomDetailStatus: { ...(prev.roomDetailStatus || ROOM_DETAIL_STATUS), [roomId]: { ...(prev.roomDetailStatus?.[roomId] || {}), status: "inspected", inspected: true } },
  }));

  const avgAll = Object.values(detail).filter(d => d.avgMinutes).reduce((s, d, _, arr) => s + d.avgMinutes / arr.length, 0);

  return (
    <div className="space-y-4">
      <GlassCard className="p-4 flex items-center justify-between">
        <div>
          <p className="text-white/40 text-xs">Temps moyen de nettoyage</p>
          <p className="text-white font-bold text-lg">{avgAll ? avgAll.toFixed(0) : "—"} min</p>
        </div>
        <ClipboardCheck size={24} style={{ color: gold }} />
      </GlassCard>

      <div className="space-y-2">
        {rooms.map(r => {
          const d = detail[r.id] || { status: r.status, assignedTo: null, avgMinutes: null, inspected: false };
          const cfg = statusCfg[d.status] || statusCfg.ready;
          return (
            <GlassCard key={r.id} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-semibold text-sm">Chambre {r.id}</p>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: `${cfg.color}25`, color: cfg.color }}>{cfg.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <select value={d.assignedTo || ""} onChange={e => assign(r.id, e.target.value)}
                  className="flex-1 bg-white/5 border rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }}>
                  <option value="" className="bg-black">Non assignée</option>
                  {HOUSEKEEPING_STAFF.map(s => <option key={s} value={s} className="bg-black">{s}</option>)}
                </select>
                {d.status !== "inspected" && d.status !== "out_of_order" && (
                  <button onClick={() => markInspected(r.id)} className="text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0" style={{ background: "rgba(212,175,55,0.15)", color: gold }}>
                    <ClipboardCheck size={11} />Inspecter
                  </button>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
