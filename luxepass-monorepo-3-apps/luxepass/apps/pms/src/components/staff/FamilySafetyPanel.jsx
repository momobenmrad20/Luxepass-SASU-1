import { Baby, MapPin, Shield } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import { BRACELETS, PMS_GUESTS } from "@shared/constants";
import { useAppState } from "@shared/hooks/useAppState";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// MODULE — SÉCURITÉ FAMILLES (bracelets 4G connectés en temps réel)
// ─────────────────────────────────────────────────────────────
export default function FamilySafetyPanel({ hotel }) {
  const { t } = useI18n();
  const { appState } = useAppState();
  const guests = appState.pmsGuests || PMS_GUESTS;
  const guestById = (id) => guests.find(g => g.id === id);
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-white font-semibold flex items-center gap-2"><Shield size={16} style={{ color: gold }} />{t.familySafetyTitle}</h3>
        <p className="text-white/40 text-xs mt-1">{t.familySafetySub}</p>
      </div>
      <div className="space-y-2">
        {BRACELETS.map(br => {
          const guest = guestById(br.guestId);
          const alert = br.status === "alert";
          return (
            <GlassCard key={br.id} className="p-4" style={alert ? { borderColor: "rgba(248,113,113,0.5)" } : {}}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: alert ? "rgba(248,113,113,0.15)" : "rgba(52,211,153,0.15)" }}>
                    <Baby size={16} style={{ color: alert ? "#f87171" : "#34d399" }} />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{br.childName}</p>
                    <p className="text-white/40 text-xs">{guest?.name} — {t.room} {br.room}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={alert ? { background: "rgba(248,113,113,0.15)", color: "#f87171" } : { background: "rgba(52,211,153,0.15)", color: "#34d399" }}>
                  {alert ? t.familySafetyAlert : t.familySafetyOk}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs mt-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div>
                  <p className="text-white/30 text-[10px]">{t.familySafetyZone}</p>
                  <p className="text-white/70 flex items-center gap-1 mt-0.5"><MapPin size={10} />{br.zone}</p>
                </div>
                <div>
                  <p className="text-white/30 text-[10px]">{t.familySafetyBattery}</p>
                  <p className="text-white/70 mt-0.5">{br.battery}%</p>
                </div>
                <div>
                  <p className="text-white/30 text-[10px]">{t.familySafetyLastPing}</p>
                  <p className="text-white/70 mt-0.5">{br.lastPing}</p>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
