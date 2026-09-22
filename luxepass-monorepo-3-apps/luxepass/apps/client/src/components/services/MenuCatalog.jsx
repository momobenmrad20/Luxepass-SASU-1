import { CreditCard, AlertTriangle, Plus } from "lucide-react";
import { gold, handleImgError } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldButton from "@shared/components/common/GoldButton";
import { MENU_CATEGORY_ORDER, MENU_ITEMS } from "@shared/constants";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de ClientDashboard (LuxePass.jsx) — onglet "menu". Aucun changement
// de logique, de nom ni de rendu.

// (copie fidèle de l'onglet spa côté panier/paiement : le panier et le paiement
// restent gérés par ClientDashboard et arrivent en props.)

export default function MenuCatalog({ hotel, cart, addToCart, cartTotal, startCardPayment, paymentInitLoading, paymentInitError }) {
  const { t } = useI18n();
  return (
    <>
      <h3 className="text-white font-semibold">{t.menu}</h3>
      {MENU_CATEGORY_ORDER.map(cat => (
        <div key={cat}>
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">{cat}</p>
          <div className="space-y-2">
            {MENU_ITEMS.filter(i => i.cat === cat).map(item => (
              <GlassCard key={item.id} className="p-3 flex items-center gap-3">
                <img src={item.image} alt={item.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" referrerPolicy="no-referrer" onError={handleImgError} />
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{item.name}</p>
                  <p className="text-white/40 text-xs mt-0.5">{item.desc}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold" style={{ color: gold }}>{item.price} {hotel.currencySymbol}</span>
                  <button onClick={() => addToCart(item)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: "rgba(212,175,55,0.2)", color: gold }}>
                    <Plus size={14} />
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      ))}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40">
          <GlassCard className="p-4" style={{ borderColor: "rgba(212,175,55,0.4)", background: "rgba(10,10,10,0.95)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">{cart.reduce((s, i) => s + i.qty, 0)} article(s)</p>
                <p className="text-sm" style={{ color: gold }}>{t.total} : {cartTotal} {hotel.currencySymbol}</p>
              </div>
              <GoldButton onClick={startCardPayment} disabled={paymentInitLoading}>
                <CreditCard size={16} /> {paymentInitLoading ? "..." : t.payQR}
              </GoldButton>
            </div>
            {paymentInitError && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                <AlertTriangle size={12} />{paymentInitError}
              </p>
            )}
          </GlassCard>
        </div>
      )}
    </>
  );
}
