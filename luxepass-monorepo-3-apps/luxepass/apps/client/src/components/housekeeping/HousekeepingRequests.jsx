import { gold, handleImgError } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldButton from "@shared/components/common/GoldButton";
import { ROOM_REQUESTS } from "@shared/constants";
import { useAppState } from "@shared/hooks/useAppState";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de ClientDashboard (LuxePass.jsx) — onglet "roomservice". Aucun changement
// de logique, de nom ni de rendu.

// (liste de demandes rapides — serviettes, oreillers… — qui crée un ticket ; ce n'est
// PAS le catalogue de room service, voir services/MenuCatalog.jsx.)

export default function HousekeepingRequests({ hotel, guestId, setModal, pushTicket }) {
  const { t } = useI18n();
  const { setAppState } = useAppState();
  return (
    <div className="space-y-3">
      <h3 className="text-white font-semibold">{t.roomService}</h3>
      {ROOM_REQUESTS.map(req => (
        <GlassCard key={req.id} className="p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
              <img src={req.image} alt={req.label} className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" onError={handleImgError} />
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(8,8,8,0.4)" }}>
                <req.icon size={16} style={{ color: gold }} />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm leading-snug">{req.label}</p>
              <p className="text-xs text-white/40">{req.price > 0 ? `${req.price} ${hotel.currencySymbol}` : "Gratuit"}</p>
            </div>
          </div>
          <GoldButton variant="ghost" className="flex-shrink-0" onClick={() => { setModal(`requested_${req.id}`); pushTicket(req.label, req.price > 0 ? "MED" : "LOW", req.price); if (req.price > 0) setAppState(prev => ({ ...prev, folios: { ...prev.folios, [guestId]: (prev.folios?.[guestId] || 0) + req.price } })); }}>
            {t.request}
          </GoldButton>
        </GlassCard>
      ))}
    </div>
  );
}
