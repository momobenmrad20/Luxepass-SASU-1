import { Star } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import { PMS_GUESTS, VIP_TIERS } from "@shared/constants";
import { useAppState } from "@shared/hooks/useAppState";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// MODULE — PROGRAMME DE FIDÉLITÉ / RECONNAISSANCE VIP
// ─────────────────────────────────────────────────────────────
export default function LoyaltyProgram({ hotel }) {
  const { t } = useI18n();
  const { appState } = useAppState();
  const guests = appState.pmsGuests || PMS_GUESTS;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-white font-semibold flex items-center gap-2"><Star size={16} style={{ color: gold }} />{t.loyaltyTitle}</h3>
        <p className="text-white/40 text-xs mt-1">{t.loyaltySub}</p>
      </div>
      <div className="space-y-2">
        {guests.map(g => {
          const tier = g.vipTier ? VIP_TIERS[g.vipTier] : null;
          return (
            <GlassCard key={g.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{g.nationality}</span>
                  <div>
                    <p className="text-white text-sm font-medium">{g.name}</p>
                    <p className="text-white/40 text-xs">{g.stays} {t.loyaltyStays}</p>
                  </div>
                </div>
                {tier ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${tier.color}22`, color: tier.color, border: `1px solid ${tier.color}55` }}>
                    {tier.label}
                  </span>
                ) : (
                  <span className="text-xs text-white/30">{t.loyaltyNoTier}</span>
                )}
              </div>
              {tier && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tier.perks.map((p, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 rounded-lg text-white/60" style={{ background: "rgba(255,255,255,0.05)" }}>{p}</span>
                  ))}
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
