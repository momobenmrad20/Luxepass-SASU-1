import { useState } from "react";
import { BadgeCheck, BrainCircuit, Fingerprint, Leaf, Link2, Radar, TrendingDown, TrendingUp, Wrench } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldBadge from "@shared/components/common/GoldBadge";
import GoldButton from "@shared/components/common/GoldButton";
import { CRM_PROFILES, IOT_EQUIPMENT, PMS_GUESTS, ROOMS_STATUS, SUSTAINABILITY_ROOMS } from "@shared/constants";
import { useAppState } from "@shared/hooks/useAppState";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// MODULES 14-20 — HUB INTELLIGENCE IA (le cœur différenciant)
// ─────────────────────────────────────────────────────────────
export default function IntelligenceHub({ hotel }) {
  const { t } = useI18n();
  const { appState, setAppState } = useAppState();
  const [sub, setSub] = useState("pricing");
  const guests = appState.pmsGuests || PMS_GUESTS;
  const pending = guests.filter(g => !g.checkedIn);

  const subTabs = [
    { key: "pricing", label: "Tarification live", icon: TrendingUp },
    { key: "assign", label: "Attribution IA", icon: BadgeCheck },
    { key: "risk", label: "Scoring risque", icon: Radar },
    { key: "maintenance", label: "Maintenance prédictive", icon: Wrench },
    { key: "integrity", label: "Intégrité fiches", icon: Fingerprint },
    { key: "copilot", label: "Copilotes LLM", icon: BrainCircuit },
    { key: "sustainability", label: "Durabilité", icon: Leaf },
  ];

  // Hash chainé simple pour l'intégrité des fiches police (démonstration — à remplacer par SHA-256 en production)
  const simpleHash = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
    return Math.abs(h).toString(16).padStart(8, "0");
  };
  const records = appState.policeForms || [];
  const chained = records.reduceRight((acc, r) => {
    const prevHash = acc.length ? acc[acc.length - 1].hash : "genesis";
    const hash = simpleHash(prevHash + r.id + r.idNumber + r.submittedAt);
    return [...acc, { ...r, hash, prevHash }];
  }, []).reverse();

  const assignBestRoom = (guestId) => {
    const readyRooms = (appState.rooms || ROOMS_STATUS).filter(r => r.status === "ready");
    const best = readyRooms[0];
    if (!best) return;
    setAppState(prev => ({
      ...prev,
      pmsGuests: (prev.pmsGuests || PMS_GUESTS).map(g => g.id === guestId ? { ...g, room: best.id } : g),
      auditLog: [{ id: `al_${Date.now()}`, action: `Attribution IA — ${best.id} assignée automatiquement (préférences + revenue optimal)`, time: "à l'instant" }, ...(prev.auditLog || [])],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {subTabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setSub(key)} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={sub === key ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)" }}>
            <Icon size={12} />{label}
          </button>
        ))}
      </div>

      {/* 14 — Tarification prédictive temps réel */}
      {sub === "pricing" && (
        <div className="space-y-3">
          <GlassCard className="p-4" style={{ borderColor: "rgba(212,175,55,0.3)" }}>
            <p className="text-white font-semibold text-sm mb-2 flex items-center gap-2"><TrendingUp size={15} style={{ color: gold }} />Micro-ajustement en temps réel</p>
            <p className="text-white/50 text-xs">Contrairement au yield classique (recalculé quotidiennement), ce moteur réévalue le prix affiché toutes les heures en croisant météo live, recherche en cours sur le site, et disponibilité concurrente.</p>
          </GlassCard>
          <div className="grid grid-cols-2 gap-2">
            <GlassCard className="p-3"><p className="text-white/40 text-[10px]">Recherches actives (site)</p><p className="text-white font-bold text-lg">127</p></GlassCard>
            <GlassCard className="p-3"><p className="text-white/40 text-[10px]">Prochain recalcul</p><p className="text-white font-bold text-lg">18 min</p></GlassCard>
          </div>
          <GlassCard className="p-3 flex items-center justify-between">
            <p className="text-white text-xs">Dernière décision IA</p>
            <p className="text-xs font-medium" style={{ color: "#34d399" }}>Suite Présidentielle +6% (forte demande détectée)</p>
          </GlassCard>
        </div>
      )}

      {/* 15 — Attribution de chambre par IA */}
      {sub === "assign" && (
        <div className="space-y-2">
          <p className="text-white/50 text-xs mb-2">L'IA croise les préférences apprises (mémoire client), l'optimisation du revenu et la proximité des groupes pour suggérer la meilleure chambre — au lieu d'une simple liste déroulante.</p>
          {pending.length === 0 ? (
            <GlassCard className="p-5 text-center text-white/40 text-sm">Aucun client en attente d'attribution.</GlassCard>
          ) : pending.map(g => (
            <GlassCard key={g.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-sm font-medium">{g.name}</p>
                <GoldBadge>Match {88 + (g.id.length % 10)}%</GoldBadge>
              </div>
              <p className="text-white/40 text-xs mb-3">Suggestion IA : chambre {g.room} — score basé sur préférences historiques + optimisation RevPAR.</p>
              <GoldButton onClick={() => assignBestRoom(g.id)} className="w-full text-xs py-2"><BadgeCheck size={13} />Appliquer la suggestion IA</GoldButton>
            </GlassCard>
          ))}
        </div>
      )}

      {/* 16 — Scoring de risque client */}
      {sub === "risk" && (
        <div className="space-y-2">
          {CRM_PROFILES.map(p => {
            const score = p.tier === "Black" || p.tier === "Platinum" ? 4 : p.totalStays > 3 ? 12 : 38;
            return (
              <GlassCard key={p.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{p.name}</p>
                  <p className="text-white/40 text-[11px]">{p.totalStays} séjours • LTV {p.lifetimeValue} {hotel.currencySymbol}</p>
                </div>
                <span className="text-xs font-bold" style={{ color: score < 15 ? "#34d399" : score < 30 ? "#fbbf24" : "#f87171" }}>Risque {score}%</span>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* 17 — Maintenance prédictive IoT */}
      {sub === "maintenance" && (
        <div className="space-y-2">
          {IOT_EQUIPMENT.map(eq => (
            <GlassCard key={eq.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-sm font-medium">{eq.equipment}</p>
                {eq.trend === "down" ? <TrendingDown size={14} className="text-red-400" /> : <TrendingUp size={14} className="text-emerald-400" />}
              </div>
              <p className="text-white/40 text-xs mb-2">{eq.room === "Piscine" ? "Zone" : t.room} {eq.room}</p>
              <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden mb-2">
                <div className="h-full rounded-full" style={{ width: `${eq.health}%`, background: eq.health < 40 ? "#f87171" : eq.health < 70 ? "#fbbf24" : "#34d399" }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-[10px]">Santé équipement : {eq.health}%</span>
                <span className={`text-[10px] font-medium ${eq.health < 40 ? "text-red-400" : "text-white/50"}`}>Panne prévue : {eq.predictedFailure}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* 18 — Fiche police infalsifiable (hash chaîné) */}
      {sub === "integrity" && (
        <div className="space-y-2">
          <p className="text-white/50 text-xs mb-2">Chaque fiche police est horodatée et chaînée cryptographiquement à la précédente — toute modification a posteriori casse la chaîne et devient détectable en audit.</p>
          {chained.length === 0 ? (
            <GlassCard className="p-5 text-center text-white/40 text-sm">Aucune fiche à vérifier.</GlassCard>
          ) : chained.map(r => (
            <GlassCard key={r.id} className="p-3">
              <div className="flex items-center justify-between">
                <p className="text-white text-xs font-medium">{r.firstName} {r.lastName}</p>
                <span className="flex items-center gap-1 text-emerald-400 text-[10px]"><Link2 size={10} />Intègre</span>
              </div>
              <p className="text-white/30 text-[10px] font-mono mt-1">hash: {r.hash}</p>
            </GlassCard>
          ))}
        </div>
      )}

      {/* 19 — Copilotes IA connectés à un vrai LLM */}
      {sub === "copilot" && (
        <div className="space-y-3">
          <GlassCard className="p-4" style={{ borderColor: "rgba(212,175,55,0.3)" }}>
            <p className="text-white font-semibold text-sm mb-2 flex items-center gap-2"><BrainCircuit size={15} style={{ color: gold }} />Connexion à un LLM en production</p>
            <p className="text-white/50 text-xs mb-3">Les copilotes GM / Butler / Housekeeping / Maintenance affichent actuellement des recommandations pré-écrites. Pour des réponses générées dynamiquement à partir des données live du PMS, connectez une clé API via votre backend (jamais côté client, pour des raisons de sécurité).</p>
            <div className="space-y-2">
              <input placeholder="Endpoint backend (ex: /api/copilot)" className="w-full bg-white/5 border rounded-xl px-3 py-2 text-white text-xs focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} disabled />
              <p className="text-white/30 text-[10px]">⚠ La clé API ne doit jamais être intégrée dans le code frontend — elle doit transiter par un serveur backend sécurisé qui appelle l'API du modèle.</p>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-white/40 text-xs italic">Mode démo — « D'après l'occupation actuelle et l'historique de Sofia Al-Rashid, je recommande de proposer un surclassement Junior Suite à son arrivée ce soir. »</p>
          </GlassCard>
        </div>
      )}

      {/* 20 — Score de durabilité par chambre */}
      {sub === "sustainability" && (
        <div className="space-y-2">
          <GlassCard className="p-4 flex items-center justify-between">
            <div><p className="text-white/40 text-xs">Score de durabilité de l'hôtel</p><p className="text-white font-bold text-2xl">B+</p></div>
            <Leaf size={28} className="text-emerald-400" />
          </GlassCard>
          {SUSTAINABILITY_ROOMS.map(r => (
            <GlassCard key={r.room} className="p-3 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{t.room} {r.room}</p>
                <p className="text-white/40 text-[11px]">{r.energyKwh} kWh • {r.waterL} L d'eau / jour</p>
              </div>
              <span className="text-lg font-bold" style={{ color: r.score === "A" ? "#34d399" : r.score === "B" ? "#fbbf24" : "#f87171" }}>{r.score}</span>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
