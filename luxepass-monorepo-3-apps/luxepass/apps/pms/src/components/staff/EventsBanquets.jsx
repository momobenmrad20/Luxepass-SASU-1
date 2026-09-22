import { useState } from "react";
import { Calendar, MapPin, Plus, Users } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldButton from "@shared/components/common/GoldButton";
import { EVENTS_BANQUETS } from "@shared/constants";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// MODULE — ÉVÉNEMENTS & BANQUETS (MICE)
// ─────────────────────────────────────────────────────────────
export default function EventsBanquets({ hotel }) {
  const { t } = useI18n();
  const [events] = useState(EVENTS_BANQUETS);
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-white font-semibold flex items-center gap-2"><Calendar size={16} style={{ color: gold }} />{t.eventsTitle}</h3>
        <p className="text-white/40 text-xs mt-1">{t.eventsSub}</p>
      </div>
      <div className="space-y-2">
        {events.map(ev => (
          <GlassCard key={ev.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-white text-sm font-semibold">{ev.name}</p>
              <span className="text-xs px-2 py-1 rounded-lg"
                style={ev.status === "confirmed" ? { background: "rgba(52,211,153,0.15)", color: "#34d399" } : { background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>
                {ev.status === "confirmed" ? t.eventStatusConfirmed : t.eventStatusPending}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
              <span className="flex items-center gap-1"><Calendar size={11} />{ev.date}</span>
              <span className="flex items-center gap-1"><MapPin size={11} />{ev.room}</span>
              <span className="flex items-center gap-1"><Users size={11} />{ev.pax} {t.eventPax}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <span className="text-white/40">{ev.roomsBlocked} {t.eventRoomsBlocked}</span>
              <span style={{ color: gold }} className="font-semibold">{t.eventDeposit} : {ev.deposit.toLocaleString()} {hotel.currencySymbol}</span>
            </div>
          </GlassCard>
        ))}
      </div>
      <GoldButton className="w-full text-sm py-2.5"><Plus size={15} />{t.newEvent}</GoldButton>
    </div>
  );
}
