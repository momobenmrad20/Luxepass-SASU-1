import { CalendarX, Check, Radar } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldBadge from "@shared/components/common/GoldBadge";
import { NOSHOW_RISK, RESERVATIONS, ROOM_TYPES, WAITLIST } from "@shared/constants";
import { useAppState } from "@shared/hooks/useAppState";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// MODULE 13 — NO-SHOW / ANNULATION / LISTE D'ATTENTE
// ─────────────────────────────────────────────────────────────
export default function NoShowWaitlist({ hotel }) {
  const { t } = useI18n();
  const { appState, setAppState } = useAppState();
  const waitlist = appState.waitlist || WAITLIST;

  const riskColor = (r) => r > 50 ? "#f87171" : r > 25 ? "#fbbf24" : "#34d399";
  const riskLabel = (r) => r > 50 ? "Élevé" : r > 25 ? "Moyen" : "Faible";

  const markNoShow = (id) => setAppState(prev => ({
    ...prev,
    reservations: (prev.reservations || RESERVATIONS).map(r => r.id === id ? { ...r, status: "cancelled" } : r),
    auditLog: [{ id: `al_${Date.now()}`, action: `No-show enregistré — réservation ${id} — frais appliqués`, time: "à l'instant" }, ...(prev.auditLog || [])],
  }));

  const notifyWaitlist = (id) => setAppState(prev => ({
    ...prev,
    waitlist: (prev.waitlist || WAITLIST).map(w => w.id === id ? { ...w, notified: true } : w),
  }));

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2 flex items-center gap-1"><Radar size={12} />Scoring de risque no-show</h4>
        <div className="space-y-2">
          {NOSHOW_RISK.map(n => (
            <GlassCard key={n.id} className="p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-white text-sm font-medium">{n.guestName}</p>
                <span className="text-xs font-bold" style={{ color: riskColor(n.risk) }}>{n.risk}% — {riskLabel(n.risk)}</span>
              </div>
              <p className="text-white/40 text-[11px] mb-2">{n.reason}</p>
              <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden mb-2">
                <div className="h-full rounded-full" style={{ width: `${n.risk}%`, background: riskColor(n.risk) }} />
              </div>
              {n.risk > 50 && (
                <button onClick={() => markNoShow(n.id)} className="text-xs px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 flex items-center gap-1">
                  <CalendarX size={11} />Marquer no-show
                </button>
              )}
            </GlassCard>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2">Liste d'attente</h4>
        {waitlist.length === 0 ? (
          <GlassCard className="p-5 text-center text-white/40 text-sm">Aucun client en liste d'attente.</GlassCard>
        ) : (
          <div className="space-y-2">
            {waitlist.map(w => (
              <GlassCard key={w.id} className="p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-white text-sm font-medium">{w.guestName}</p>
                  <p className="text-white/40 text-xs">{ROOM_TYPES.find(r => r.id === w.roomType)?.name} • {w.desiredDate}</p>
                </div>
                {w.notified ? <GoldBadge><Check size={10} />Notifié</GoldBadge> : (
                  <button onClick={() => notifyWaitlist(w.id)} className="text-xs px-2.5 py-1 rounded-lg flex-shrink-0" style={{ background: "rgba(212,175,55,0.15)", color: gold }}>Notifier</button>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
