import { useState } from "react";
import { AlertTriangle, Check, Eye, Search } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldBadge from "@shared/components/common/GoldBadge";
import Modal from "@shared/components/common/Modal";
import { CRM_PROFILES } from "@shared/constants";
import { useAppState } from "@shared/hooks/useAppState";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// MODULE 6 — CRM UNIFIÉ MULTI-SÉJOURS
// ─────────────────────────────────────────────────────────────
export default function CRMHub({ hotel }) {
  const { t } = useI18n();
  const { appState, setAppState } = useAppState();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const blacklist = appState.crmBlacklist || {};

  const tierColor = (tier) => ({ Silver: "#94a3b8", Gold: "#fbbf24", Platinum: "#e5e7eb", Black: "#111" }[tier] || gold);

  const filtered = CRM_PROFILES.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const toggleBlacklist = (id) => setAppState(prev => ({ ...prev, crmBlacklist: { ...(prev.crmBlacklist || {}), [id]: !prev.crmBlacklist?.[id] } }));

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un client..."
          className="w-full bg-white/5 border rounded-xl pl-9 pr-3 py-2.5 text-white text-sm focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
      </div>
      <div className="space-y-2">
        {filtered.map(p => (
          <GlassCard key={p.id} onClick={() => setSelected(p)} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{p.name}</p>
                <p className="text-white/40 text-xs">{p.totalStays} séjours • {p.hotelsVisited.length} établissements</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${tierColor(p.tier)}25`, color: tierColor(p.tier) }}>{p.tier}</span>
                {blacklist[p.id] && <p className="text-red-400 text-[10px] mt-1">⚠ Liste noire</p>}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-white/40">Séjours totaux</p><p className="text-white text-sm font-bold">{selected.totalStays}</p></div>
              <div><p className="text-xs text-white/40">Valeur client (LTV)</p><p className="text-sm font-bold" style={{ color: gold }}>{selected.lifetimeValue} {hotel.currencySymbol}</p></div>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-1">Établissements visités</p>
              <div className="flex flex-wrap gap-1">{selected.hotelsVisited.map(h => <GoldBadge key={h}>{h}</GoldBadge>)}</div>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-1">Préférences consolidées (tous séjours)</p>
              {selected.prefs.length === 0 ? <p className="text-white/30 text-xs">Aucune préférence enregistrée.</p> : (
                <div className="space-y-1">{selected.prefs.map((pr, i) => <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg p-2 text-xs text-white/70"><Eye size={11} style={{ color: gold }} />{pr}</div>)}</div>
              )}
            </div>
            <button onClick={() => toggleBlacklist(selected.id)} className="w-full text-xs py-2 rounded-xl flex items-center justify-center gap-2" style={blacklist[selected.id] ? { background: "rgba(16,185,129,0.15)", color: "#34d399" } : { background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
              {blacklist[selected.id] ? <><Check size={12} />Retirer de la liste noire</> : <><AlertTriangle size={12} />Ajouter à la liste noire</>}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
