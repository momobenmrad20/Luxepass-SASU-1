import { useEffect, useRef } from "react";
import { BrainCircuit, Eye, MapPin, MessageSquare, Send, Sparkles, User } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldBadge from "@shared/components/common/GoldBadge";
import ExploreCityModal from "./ExploreCityModal";
import MemoryModal from "./MemoryModal";
import { useI18n } from "@shared/hooks/useI18n";
import { useConcierge } from "@shared/hooks/useConcierge";

// MODULE 1 & 5 — CONCIERGE CHAT (mémoire conversationnelle + handoff humain).
// Composant de présentation : la conversation, le handoff humain et l'itinéraire
// vivent dans hooks/useConcierge.js. Rendu inchangé (seuls les deux handlers
// inline des modales sont devenus handleClearMemory / handleCityBooked).

export default function ConciergeChat({ guest, hotel, memory, onMemoryNote, pushTicket, onClearMemory }) {
  const { t } = useI18n();
  const {
    messages, input, setInput, typing, handoff,
    memoryOpen, setMemoryOpen, exploreOpen, setExploreOpen, itinerary,
    send, startHandoff, generateItinerary, handleClearMemory, handleCityBooked,
  } = useConcierge({ guest, pushTicket, onMemoryNote, onClearMemory });
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2"><MessageSquare size={16} style={{ color: gold }} />{t.concierge}</h3>
        <GoldBadge><BrainCircuit size={10} />IA</GoldBadge>
      </div>

      {/* Quick actions — modules 4, 5, 6 */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setMemoryOpen(true)} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(212,175,55,0.15)" }}>
          <Eye size={12} /> {t.viewMemory}
        </button>
        <button onClick={() => setExploreOpen(true)} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(212,175,55,0.15)" }}>
          <MapPin size={12} /> {t.exploreCity}
        </button>
        <button onClick={generateItinerary} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(212,175,55,0.15)" }}>
          <Sparkles size={12} /> {t.generateItinerary}
        </button>
        {handoff === "none" && (
          <button onClick={startHandoff} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(212,175,55,0.15)" }}>
            <User size={12} /> {t.talkHuman}
          </button>
        )}
      </div>

      {itinerary && (
        <GlassCard className="p-4 space-y-2" style={{ borderColor: "rgba(212,175,55,0.25)" }}>
          <p className="text-sm font-semibold text-white flex items-center gap-2"><Sparkles size={14} style={{ color: gold }} />{t.itineraryFor}</p>
          {itinerary.map((step, i) => (
            <p key={i} className="text-xs text-white/70 leading-relaxed pl-3 border-l" style={{ borderColor: "rgba(212,175,55,0.3)" }}>{step}</p>
          ))}
        </GlassCard>
      )}

      {/* Chat window */}
      <GlassCard className="p-4">
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
              {m.from === "system" ? (
                <p className="text-xs text-white/30 italic text-center w-full">{m.text}</p>
              ) : (
                <div className="max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                  style={m.from === "user"
                    ? { background: gold, color: "#000" }
                    : m.from === "human"
                      ? { background: "rgba(16,185,129,0.15)", color: "#e5fff5", border: "1px solid rgba(16,185,129,0.3)" }
                      : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.85)" }}>
                  {m.from === "human" && <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 mb-1"><User size={10} />{t.talkHuman}</span>}
                  {m.text}
                </div>
              )}
            </div>
          ))}
          {typing && <p className="text-xs text-white/30 italic">{t.aiTyping}</p>}
          <div ref={scrollRef} />
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: "rgba(212,175,55,0.1)" }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
            placeholder={t.chatPlaceholder}
            className="flex-1 bg-white/5 border rounded-xl px-3.5 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none"
            style={{ borderColor: "rgba(212,175,55,0.2)" }} />
          <button onClick={send} className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: gold, color: "#000" }}>
            <Send size={15} />
          </button>
        </div>
      </GlassCard>

      <MemoryModal open={memoryOpen} onClose={() => setMemoryOpen(false)} memory={memory}
        onClear={handleClearMemory} />
      <ExploreCityModal open={exploreOpen} onClose={() => setExploreOpen(false)} hotel={hotel}
        onBooked={handleCityBooked} />
    </div>
  );
}
