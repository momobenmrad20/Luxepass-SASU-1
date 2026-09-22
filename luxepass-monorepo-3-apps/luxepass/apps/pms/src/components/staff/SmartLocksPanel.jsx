import { Gauge, Key, Send } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import { SMART_LOCKS } from "@shared/constants";
import { useAppState } from "@shared/hooks/useAppState";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// MODULE 10 — SERRURES ÉLECTRONIQUES CONNECTÉES
// ─────────────────────────────────────────────────────────────
export default function SmartLocksPanel() {
  const { t } = useI18n();
  const { appState, setAppState } = useAppState();
  const locks = appState.smartLocks || SMART_LOCKS;

  const toggleLock = (room) => setAppState(prev => ({
    ...prev,
    smartLocks: (prev.smartLocks || SMART_LOCKS).map(l => l.room === room ? { ...l, locked: !l.locked, lastAccess: "à l'instant — Réceptionniste (à distance)" } : l),
  }));

  const issueKey = (room) => setAppState(prev => ({
    ...prev,
    smartLocks: (prev.smartLocks || SMART_LOCKS).map(l => l.room === room ? { ...l, lastAccess: "à l'instant — Clé virtuelle émise vers le mobile du client" } : l),
    auditLog: [{ id: `al_${Date.now()}`, action: `Clé virtuelle émise — Chambre ${room}`, time: "à l'instant" }, ...(prev.auditLog || [])],
  }));

  return (
    <div className="space-y-2">
      {locks.map(l => (
        <GlassCard key={l.room} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white font-semibold text-sm flex items-center gap-2"><Key size={14} style={{ color: gold }} />Chambre {l.room}</p>
            <div className="flex items-center gap-1.5">
              <Gauge size={12} className={l.battery < 20 ? "text-red-400" : "text-white/30"} />
              <span className={`text-xs ${l.battery < 20 ? "text-red-400" : "text-white/40"}`}>{l.battery}%</span>
            </div>
          </div>
          <p className="text-white/40 text-[11px] mb-3">{l.lastAccess}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => toggleLock(l.room)} className="flex-1 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1" style={l.locked ? { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" } : { background: "rgba(16,185,129,0.15)", color: "#34d399" }}>
              <Key size={11} />{l.locked ? "Verrouillée" : "Déverrouillée"}
            </button>
            <button onClick={() => issueKey(l.room)} className="flex-1 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1" style={{ background: "rgba(212,175,55,0.15)", color: gold }}>
              <Send size={11} />Émettre clé virtuelle
            </button>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
