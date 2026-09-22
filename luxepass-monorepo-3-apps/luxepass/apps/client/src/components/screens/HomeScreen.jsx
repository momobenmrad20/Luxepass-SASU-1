import { ChevronRight, MapPin, Star } from "lucide-react";
import { gold, handleImgError } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldBadge from "@shared/components/common/GoldBadge";
import { HOTELS } from "@shared/constants";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// HOME / HOTEL SELECTION
// ─────────────────────────────────────────────────────────────
export default function HomeScreen({ onSelectHotel, hotels }) {
  const { t, lang } = useI18n();
  const list = hotels || HOTELS;
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, #080808 0%, #111 60%, #0a0a0a 100%)" }}>
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        {/* Logo SVG */}
        <div className="mb-8">
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
            <circle cx="36" cy="36" r="35" stroke={gold} strokeWidth="1.5" />
            <path d="M36 14L42 28H58L46 37L50 52L36 43L22 52L26 37L14 28H30L36 14Z" fill={gold} fillOpacity="0.9" />
            <circle cx="36" cy="36" r="6" fill="none" stroke={gold} strokeWidth="1" opacity="0.4" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2" style={{ color: gold, fontFamily: "'Georgia', serif" }}>LuxePass</h1>
        <div className="w-16 h-px my-4" style={{ background: gold, opacity: 0.4 }} />
        <p className="text-white text-lg font-light max-w-sm leading-relaxed mb-2">{t.tagline}</p>
        <p className="text-white/40 text-sm">{t.subtitle}</p>
      </div>

      {/* Hotel Selection */}
      <div className="px-4 pb-10">
        <p className="text-center text-white/50 text-sm mb-4 uppercase tracking-widest">{t.selectHotel}</p>
        <div className="space-y-3 max-w-sm mx-auto">
          {list.map(hotel => (
            <GlassCard key={hotel.id} onClick={() => onSelectHotel(hotel)} className="overflow-hidden group"
              style={{ borderColor: "rgba(212,175,55,0.2)" }}>
              <div className="relative h-32 overflow-hidden">
                <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500" referrerPolicy="no-referrer" onError={handleImgError} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }} />
                <div className="absolute bottom-0 left-0 p-3">
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: hotel.stars }).map((_, i) => <Star key={i} size={10} fill={gold} style={{ color: gold }} />)}
                  </div>
                  <p className="text-white font-bold text-sm">{hotel.name}</p>
                  <p className="text-white/60 text-xs flex items-center gap-1"><MapPin size={10} />{hotel.location}</p>
                </div>
                <div className="absolute top-3 right-3">
                  <GoldBadge>{hotel.currencySymbol}</GoldBadge>
                </div>
              </div>
              <div className="px-3 py-2.5 flex items-center justify-between">
                <p className="text-white/50 text-xs">{hotel.description}</p>
                <ChevronRight size={16} style={{ color: gold }} />
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
