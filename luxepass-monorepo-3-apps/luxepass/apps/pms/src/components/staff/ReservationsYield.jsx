import { useState } from "react";
import { AlertTriangle, ToggleLeft, ToggleRight, TrendingUp, X } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import { CHANNELS, RESERVATIONS, ROOM_TYPES, YIELD_FACTORS } from "@shared/constants";
import { useAppState } from "@shared/hooks/useAppState";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// MODULE 1+2 — RÉSERVATIONS MULTI-CANAL & YIELD/REVENUE MANAGEMENT
// ─────────────────────────────────────────────────────────────
export default function ReservationsYield({ hotel }) {
  const { t } = useI18n();
  const { appState, setAppState } = useAppState();
  const [subTab, setSubTab] = useState("reservations");
  const [autoPilot, setAutoPilot] = useState(true);
  const reservations = appState.reservations || RESERVATIONS;

  const channelInfo = (key) => CHANNELS.find(c => c.key === key) || CHANNELS[0];
  const statusColor = (s) => s === "confirmed" ? "#34d399" : s === "waitlist" ? "#fbbf24" : s === "pending" ? "#60a5fa" : "#f87171";
  const statusLabel = (s) => ({ confirmed: "Confirmée", waitlist: "Liste d'attente", pending: "En attente", cancelled: "Annulée" }[s] || s);

  const bookedByType = (typeId) => reservations.filter(r => r.roomType === typeId && r.status !== "cancelled").reduce((sum, r) => sum + (r.pax > 1 && r.groupName ? 1 : 1), 0);

  const totalImpact = YIELD_FACTORS.reduce((s, f) => s + f.impact, 0);

  const cancelReservation = (id) => setAppState(prev => ({ ...prev, reservations: (prev.reservations || RESERVATIONS).map(r => r.id === id ? { ...r, status: "cancelled" } : r) }));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setSubTab("reservations")} className="flex-1 py-2 rounded-xl text-xs font-medium" style={subTab === "reservations" ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>Réservations</button>
        <button onClick={() => setSubTab("yield")} className="flex-1 py-2 rounded-xl text-xs font-medium" style={subTab === "yield" ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>Yield & Tarifs</button>
      </div>

      {subTab === "reservations" && (
        <div className="space-y-4">
          {/* Allotement par type de chambre */}
          <div>
            <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2">Allotement par catégorie</h4>
            <div className="grid grid-cols-2 gap-2">
              {ROOM_TYPES.map(rt => {
                const booked = bookedByType(rt.id);
                const over = booked > rt.total;
                return (
                  <GlassCard key={rt.id} className="p-3">
                    <p className="text-white text-xs font-medium truncate">{rt.name}</p>
                    <p className={`text-lg font-bold mt-1 ${over ? "text-red-400" : ""}`} style={!over ? { color: gold } : {}}>{booked}/{rt.total}</p>
                    {over && <p className="text-red-400 text-[10px] flex items-center gap-1 mt-0.5"><AlertTriangle size={10} />Overbooking</p>}
                  </GlassCard>
                );
              })}
            </div>
          </div>

          {/* Liste des réservations multi-canal */}
          <div>
            <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2">Réservations — tous canaux</h4>
            <div className="space-y-2">
              {reservations.map(r => {
                const ch = channelInfo(r.channel);
                return (
                  <GlassCard key={r.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{r.guestName}</p>
                        <p className="text-white/40 text-xs">{ROOM_TYPES.find(t2 => t2.id === r.roomType)?.name} • {r.checkIn} → {r.checkOut}</p>
                      </div>
                      <span className="text-xs font-bold flex-shrink-0" style={{ color: gold }}>{r.rate} {hotel.currencySymbol}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${ch.color}25`, color: ch.color }}>{ch.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium" style={{ color: statusColor(r.status) }}>{statusLabel(r.status)}</span>
                        {r.status !== "cancelled" && (
                          <button onClick={() => cancelReservation(r.id)} className="text-red-400 text-xs"><X size={12} /></button>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {subTab === "yield" && (
        <div className="space-y-4">
          <GlassCard className="p-4" style={{ borderColor: "rgba(212,175,55,0.3)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-semibold text-sm flex items-center gap-2"><TrendingUp size={15} style={{ color: gold }} />Pilotage tarifaire IA</p>
              <button onClick={() => setAutoPilot(!autoPilot)} style={{ color: autoPilot ? "#34d399" : "rgba(255,255,255,0.3)" }}>
                {autoPilot ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
              </button>
            </div>
            <p className="text-white/50 text-xs mb-3">{autoPilot ? "Ajustement automatique activé — les tarifs se mettent à jour selon la demande en temps réel." : "Mode manuel — les tarifs restent figés jusqu'à validation."}</p>
            <div className="text-center py-3 rounded-xl" style={{ background: "rgba(212,175,55,0.08)" }}>
              <p className="text-white/40 text-xs">Ajustement net suggéré</p>
              <p className="text-2xl font-bold" style={{ color: totalImpact >= 0 ? "#34d399" : "#f87171" }}>{totalImpact >= 0 ? "+" : ""}{totalImpact}%</p>
            </div>
          </GlassCard>

          <div>
            <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2">Facteurs de demande</h4>
            <div className="space-y-2">
              {YIELD_FACTORS.map(f => (
                <div key={f.key} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                  <p className="text-white text-xs">{f.label}</p>
                  <span className="text-xs font-bold" style={{ color: f.impact >= 0 ? "#34d399" : "#f87171" }}>{f.impact >= 0 ? "+" : ""}{f.impact}%</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2">Tarifs recommandés par catégorie</h4>
            <div className="grid grid-cols-2 gap-2">
              {ROOM_TYPES.map(rt => {
                const adjusted = Math.round(rt.baseRate * (1 + totalImpact / 100));
                return (
                  <GlassCard key={rt.id} className="p-3">
                    <p className="text-white/50 text-[10px] truncate">{rt.name}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-white/30 text-xs line-through">{rt.baseRate}</span>
                      <span className="text-base font-bold" style={{ color: gold }}>{adjusted} {hotel.currencySymbol}</span>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
