import { Boxes, ShoppingBag } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import { FNB_STOCK } from "@shared/constants";
import { useAppState } from "@shared/hooks/useAppState";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// MODULE 11 — GESTION DES STOCKS F&B & POS
// ─────────────────────────────────────────────────────────────
export default function FnBStockPanel() {
  const { t } = useI18n();
  const { appState, setAppState } = useAppState();
  const stock = appState.fnbStock || FNB_STOCK;
  const liveOrders = appState.liveOrders || [];

  const restock = (id) => setAppState(prev => ({
    ...prev,
    fnbStock: (prev.fnbStock || FNB_STOCK).map(s => s.id === id ? { ...s, qty: s.qty + Math.round(s.threshold * 1.5) } : s),
  }));

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2 flex items-center gap-1"><Boxes size={12} />Inventaire</h4>
        <div className="space-y-2">
          {stock.map(s => {
            const low = s.qty < s.threshold;
            return (
              <GlassCard key={s.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{s.name}</p>
                  <p className="text-white/40 text-xs">{s.category} • seuil {s.threshold} {s.unit}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${low ? "text-red-400" : "text-white"}`}>{s.qty} {s.unit}</p>
                  {low && <button onClick={() => restock(s.id)} className="text-[10px] px-2 py-0.5 rounded-lg mt-1" style={{ background: "rgba(212,175,55,0.15)", color: gold }}>Réapprovisionner</button>}
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2 flex items-center gap-1"><ShoppingBag size={12} />Flux POS temps réel</h4>
        {liveOrders.length === 0 ? (
          <GlassCard className="p-5 text-center text-white/40 text-sm">Aucune commande active.</GlassCard>
        ) : (
          <div className="space-y-2">
            {liveOrders.map(o => (
              <GlassCard key={o.id} className="p-3">
                <p className="text-white text-xs font-medium">{o.guest} — {t.room} {o.room}</p>
                <p className="text-white/40 text-[11px]">{o.items.join(", ")}</p>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
