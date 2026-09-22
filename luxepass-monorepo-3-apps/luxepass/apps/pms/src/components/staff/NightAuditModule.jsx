import { useState } from "react";
import { CalendarClock, RefreshCw } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldButton from "@shared/components/common/GoldButton";
import { PMS_GUESTS } from "@shared/constants";
import { useAppState } from "@shared/hooks/useAppState";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// MODULE 4 — NIGHT AUDIT (clôture de nuit)
// ─────────────────────────────────────────────────────────────
export default function NightAuditModule({ hotel }) {
  const { t } = useI18n();
  const { appState, setAppState } = useAppState();
  const [running, setRunning] = useState(false);
  const log = appState.nightAuditLog || [];
  const guests = appState.pmsGuests || PMS_GUESTS;

  const runAudit = () => {
    setRunning(true);
    setTimeout(() => {
      const totalRevenue = guests.reduce((s, g) => s + (appState.folios?.[g.id] || 0), 0) + Math.round(Math.random() * 800);
      const occ = Math.round(70 + Math.random() * 25);
      const adr = Math.round(280 + Math.random() * 100);
      const entry = {
        id: `na_${Date.now()}`,
        date: new Date().toLocaleDateString(),
        totalRevenue: totalRevenue.toFixed(0),
        occupancy: occ,
        adr,
        revpar: Math.round(adr * occ / 100),
        guestsCharged: guests.length,
      };
      setAppState(prev => ({
        ...prev,
        nightAuditLog: [entry, ...(prev.nightAuditLog || [])],
        auditLog: [{ id: `al_${Date.now()}`, action: `Night audit clôturé — ${entry.date}`, time: "à l'instant" }, ...(prev.auditLog || [])],
      }));
      setRunning(false);
    }, 2200);
  };

  return (
    <div className="space-y-4">
      <GlassCard className="p-5 text-center" style={{ borderColor: "rgba(212,175,55,0.3)" }}>
        <CalendarClock size={28} style={{ color: gold }} className="mx-auto mb-2" />
        <p className="text-white font-semibold text-sm mb-1">Clôture de nuit</p>
        <p className="text-white/40 text-xs mb-4">Recalcule les charges, applique la taxe de séjour à tous les clients présents, et verrouille la journée comptable.</p>
        <GoldButton onClick={runAudit} disabled={running} className="w-full">
          {running ? <><RefreshCw size={14} className="animate-spin" />Traitement en cours...</> : <><CalendarClock size={14} />Lancer la clôture de nuit</>}
        </GoldButton>
      </GlassCard>

      {log.length > 0 && (
        <div>
          <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2">Historique des clôtures</h4>
          <div className="space-y-2">
            {log.map(entry => (
              <GlassCard key={entry.id} className="p-4">
                <p className="text-white text-sm font-medium mb-2">{entry.date}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-white/40 text-[10px]">Revenu</p><p className="text-white font-bold text-sm">{entry.totalRevenue} {hotel.currencySymbol}</p></div>
                  <div><p className="text-white/40 text-[10px]">Occupation</p><p className="text-white font-bold text-sm">{entry.occupancy}%</p></div>
                  <div><p className="text-white/40 text-[10px]">RevPAR</p><p className="font-bold text-sm" style={{ color: gold }}>{entry.revpar} {hotel.currencySymbol}</p></div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
