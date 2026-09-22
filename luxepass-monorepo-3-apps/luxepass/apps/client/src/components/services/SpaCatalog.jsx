import { CreditCard, AlertTriangle, Plus } from "lucide-react";
import { gold, handleImgError } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldButton from "@shared/components/common/GoldButton";
import { OCEANA_GALLERY, SERVICES_CATALOG } from "@shared/constants";
import { useAppState } from "@shared/hooks/useAppState";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de ClientDashboard (LuxePass.jsx) — onglet "spa". Aucun changement
// de logique, de nom ni de rendu.

// SPA_CATEGORY_ORDER / spaItems n'étaient utilisés que par cet onglet : déplacés ici.

export default function SpaCatalog({ hotel, cart, addToCart, cartTotal, startCardPayment, paymentInitLoading, paymentInitError }) {
  const { t } = useI18n();
  const { appState } = useAppState();
  const SPA_CATEGORY_ORDER = [
    "Spa — Visage Cinq Mondes",
    "Spa — Corps Cinq Mondes",
    "Spa — Massages Cinq Mondes",
    "Spa — Grands Rituels",
    "Spa — Massages Signature",
    "Spa — Soins Humides",
    "Beauté — Mains & Pieds",
    "Beauté — Cheveux",
    "Beauté — Épilation",
    "Spa — Journées Oceana",
    "Spa — Escapades Oceana",
  ];
  const spaItems = (appState.services || SERVICES_CATALOG).filter(s => SPA_CATEGORY_ORDER.includes(s.category) && s.active);

  return (
    <>
      <div className="relative h-40 -mx-4 mb-1 overflow-hidden">
        <img src={OCEANA_GALLERY["Spa & Bien-Être"][0]} alt="Spa & Bien-Être Oceana" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" onError={handleImgError} />
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(8,8,8,0.15) 0%, rgba(8,8,8,0.55) 60%, #080808 100%)` }} />
        <div className="relative h-full px-4 flex items-end pb-3">
          <h3 className="text-white font-semibold text-lg drop-shadow" style={{ fontFamily: "'Georgia', serif" }}>{t.spa}</h3>
        </div>
      </div>
      {SPA_CATEGORY_ORDER.map((cat, catIdx) => {
        const items = spaItems.filter(i => i.category === cat);
        if (items.length === 0) return null;
        const catImage = OCEANA_GALLERY["Spa & Bien-Être"][catIdx % OCEANA_GALLERY["Spa & Bien-Être"].length];
        return (
          <div key={cat}>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2">{cat.replace(/^(Spa|Beauté) — /, "")}</p>
            <div className="space-y-2">
              {items.map(item => (
                <GlassCard key={item.id} className="p-3 flex items-center gap-3">
                  <img src={catImage} alt={cat} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" referrerPolicy="no-referrer" onError={handleImgError} />
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">{item.name}</p>
                    {item.duration && <p className="text-white/40 text-xs mt-0.5">{item.duration}</p>}
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
        );
      })}
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
