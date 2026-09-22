import { useState, useEffect } from "react";
import { BrainCircuit, ChevronDown, Zap } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldBadge from "@shared/components/common/GoldBadge";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// BUTLER RECOMMENDATION
// ─────────────────────────────────────────────────────────────
export default function ButlerRecommendation({ guest }) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [everExpanded, setEverExpanded] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setCollapsed(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  if (!guest) return null;
  const messages = [];
  const age = parseInt(guest.age);
  const origin = (guest.from || "").toLowerCase();
  const prof = (guest.profession || "").toLowerCase();
  const isLongHaul = origin.includes("dubaï") || origin.includes("dubai") || origin.includes("usa") || origin.includes("canada") || origin.includes("asie") || origin.includes("japon");
  const isYoung = age > 0 && age < 35;
  const isExec = prof.includes("directeur") || prof.includes("architecte") || prof.includes("ceo") || prof.includes("manager") || prof.includes("conseil");

  if (isLongHaul) messages.push({ icon: "✈️", text: t.dir === "rtl" ? "لاحظنا قدومك من رحلة طويلة. نوصيك بجلسة سبا مريحة أو كوكتيل ترحيبي في غرفتك." : "Nous avons détecté un long vol. Notre Spa vous attend pour une décompression royale, ou souhaitez-vous un cocktail de bienvenue en chambre ?" });
  if (isYoung) messages.push({ icon: "🎾", text: t.dir === "rtl" ? "استمتع بمرافق التنس والبادل الاحترافية لدينا — متاحة الآن!" : "Profitez de nos courts de Tennis & Padel flambant neufs — réservation prioritaire disponible !" });
  if (isExec) messages.push({ icon: "⛳", text: t.dir === "rtl" ? "يُوصى لك بجولة غولف حصرية أو الوصول إلى صالة الأعمال الفاخرة." : "En tant que profil exécutif, nous vous recommandons notre parcours de Golf privé ou l'accès à notre Business Lounge." });
  if (!messages.length) messages.push({ icon: "🌟", text: t.dir === "rtl" ? "مرحباً بك! فريقنا في خدمتك على مدار الساعة." : "Bienvenue ! Notre équipe est à votre disposition 24h/24." });

  if (collapsed) {
    return (
      <button onClick={() => { setCollapsed(false); setEverExpanded(true); }}
        className="flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 animate-in fade-in"
        style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)" }}>
        <BrainCircuit size={14} style={{ color: gold }} />
        <span className="text-xs text-white/60">{t.virtualButler}</span>
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: gold }} />
      </button>
    );
  }

  return (
    <GlassCard className="p-5 space-y-3 transition-all duration-300" style={{ borderColor: "rgba(212,175,55,0.25)", background: "rgba(212,175,55,0.04)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BrainCircuit size={18} style={{ color: gold }} />
          <span className="text-sm font-semibold text-white">{t.virtualButler}</span>
          <GoldBadge><Zap size={10} />IA</GoldBadge>
        </div>
        {everExpanded && (
          <button onClick={() => setCollapsed(true)} className="p-1 rounded-lg text-white/30 hover:text-white/60 transition-colors">
            <ChevronDown size={16} />
          </button>
        )}
      </div>
      {messages.map((m, i) => (
        <div key={i} className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
          <span className="text-xl">{m.icon}</span>
          <p className="text-sm text-white/80 leading-relaxed">{m.text}</p>
        </div>
      ))}
    </GlassCard>
  );
}
