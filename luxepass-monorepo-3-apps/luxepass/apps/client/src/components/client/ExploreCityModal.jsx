import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import Modal from "@shared/components/common/Modal";
import { EXTERNAL_PARTNERS } from "@shared/constants";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// MODULE 4 — ORCHESTRATION HORS DES MURS (partenaires externes + itinéraire IA)
// ─────────────────────────────────────────────────────────────
export default function ExploreCityModal({ open, onClose, hotel, onBooked }) {
  const { t, lang } = useI18n();
  return (
    <Modal open={open} onClose={onClose} title={t.externalPartners}>
      <div className="space-y-2">
        {EXTERNAL_PARTNERS.map(p => (
          <GlassCard key={p.id} className="p-3 flex items-center justify-between gap-3">
            <div className="flex-1">
              <p className="text-white text-sm font-medium">{p.name}</p>
              <p className="text-white/40 text-xs">{lang === "en" ? p.type_en : p.type_fr}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-bold mb-1" style={{ color: gold }}>{p.price} {hotel.currencySymbol}</p>
              <button onClick={() => onBooked(p)} className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: "rgba(212,175,55,0.2)", color: gold }}>
                {t.reserve}
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
    </Modal>
  );
}
