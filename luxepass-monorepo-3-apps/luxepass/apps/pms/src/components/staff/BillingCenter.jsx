import { useState } from "react";
import { FileText, Lock, Split } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldBadge from "@shared/components/common/GoldBadge";
import GoldButton from "@shared/components/common/GoldButton";
import { INVOICE_ENTRIES_SAMPLE, PAYMENT_TOKENS, PMS_GUESTS } from "@shared/constants";
import { useAppState } from "@shared/hooks/useAppState";
import { useI18n } from "@shared/hooks/useI18n";
import { useLiveFeed } from "@shared/hooks/useLiveFeed";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// MODULE 3+8 — FACTURATION COMPLÈTE (folio, split billing, taxes, PCI-DSS)
// ─────────────────────────────────────────────────────────────
export default function BillingCenter({ hotel }) {
  const { t } = useI18n();
  const { appState, setAppState } = useAppState();
  const { digitalFolios } = useLiveFeed();
  const [invoiceType, setInvoiceType] = useState("individual");
  const [splitCount, setSplitCount] = useState(1);
  const guests = appState.pmsGuests || PMS_GUESTS;
  const tokens = PAYMENT_TOKENS;

  const taxeSejour = 3; // par pers/nuit en DT — simplifié
  const tvaRate = 0.13;

  return (
    <div className="space-y-5">
      {/* Folios réels — commandes + services facturés sur les séjours digitaux */}
      <div>
        <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
          Folios réels (séjours digitaux) <GoldBadge>{digitalFolios.grandTotal?.toFixed(1) || "0.0"} {hotel.currencySymbol} au total</GoldBadge>
        </h4>
        {(!digitalFolios.folios || digitalFolios.folios.length === 0) ? (
          <GlassCard className="p-4 text-center text-white/40 text-xs mb-2">Aucune commande facturée sur un séjour digital pour l'instant</GlassCard>
        ) : (
          <div className="space-y-2 mb-2">
            {digitalFolios.folios.map(f => (
              <GlassCard key={f.stayId} className="p-3">
                <div className="flex items-center justify-between">
                  <p className="text-white text-sm font-medium">{f.guestName || "Client"} — {t.room} {f.room || "—"}</p>
                  <p className="font-bold text-sm" style={{ color: gold }}>{f.total.toFixed(1)} {hotel.currencySymbol}</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-white/40 mt-1">
                  <span>Commandes : {f.ordersTotal.toFixed(1)} {hotel.currencySymbol}</span>
                  <span>Services facturés : {f.servicesTotal.toFixed(1)} {hotel.currencySymbol}</span>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Folios (registre manuel, démo) */}
      <div>
        <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2">Folios en cours (registre manuel)</h4>
        <div className="space-y-2">
          {guests.map(g => {
            const folio = appState.folios?.[g.id] || 0;
            const tva = folio * tvaRate;
            return (
              <GlassCard key={g.id} className="p-3">
                <div className="flex items-center justify-between">
                  <p className="text-white text-sm font-medium">{g.name} — {t.room} {g.room}</p>
                  <p className="font-bold text-sm" style={{ color: gold }}>{folio.toFixed(1)} {hotel.currencySymbol}</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-white/40 mt-1">
                  <span>Dont TVA 13% : {tva.toFixed(1)} {hotel.currencySymbol}</span>
                  <span>Taxe séjour : {taxeSejour} {hotel.currencySymbol}/nuit</span>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* Facturation société vs individuelle + split billing */}
      <GlassCard className="p-4">
        <p className="text-white font-semibold text-sm mb-3 flex items-center gap-2"><FileText size={15} style={{ color: gold }} />Génération de facture</p>
        <div className="flex gap-2 mb-3">
          {["individual", "company"].map(ty => (
            <button key={ty} onClick={() => setInvoiceType(ty)} className="flex-1 py-2 rounded-xl text-xs font-medium" style={invoiceType === ty ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
              {ty === "individual" ? "Client individuel" : "Facture société"}
            </button>
          ))}
        </div>
        {invoiceType === "company" && (
          <div className="space-y-2 mb-3">
            <input placeholder="Raison sociale" className="w-full bg-white/5 border rounded-xl px-3 py-2 text-white text-xs focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
            <input placeholder="Matricule fiscal" className="w-full bg-white/5 border rounded-xl px-3 py-2 text-white text-xs focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
          </div>
        )}
        <div className="flex items-center gap-2 mb-3">
          <Split size={14} className="text-white/40" />
          <p className="text-xs text-white/50">Répartir sur</p>
          <input type="number" min="1" value={splitCount} onChange={e => setSplitCount(Math.max(1, Number(e.target.value)))} className="w-14 bg-white/5 border rounded-lg px-2 py-1 text-white text-xs text-center focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
          <p className="text-xs text-white/50">payeur(s)</p>
        </div>
        <div className="space-y-1 mb-3">
          {INVOICE_ENTRIES_SAMPLE.map((e, i) => (
            <div key={i} className="flex items-center justify-between text-xs text-white/60">
              <span>{e.label}</span><span>{(e.amount / splitCount).toFixed(1)} {hotel.currencySymbol}</span>
            </div>
          ))}
        </div>
        <GoldButton className="w-full text-xs py-2"><FileText size={13} />Générer la facture</GoldButton>
      </GlassCard>

      {/* PCI-DSS — tokenisation des cartes */}
      <div>
        <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2 flex items-center gap-1"><Lock size={12} />Paiement sécurisé — conformité PCI-DSS</h4>
        <div className="space-y-2">
          {tokens.map(tk => (
            <GlassCard key={tk.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="text-white text-xs font-medium">{tk.brand} •••• {tk.last4}</p>
                <p className="text-white/30 text-[10px] font-mono">{tk.token}</p>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: gold }}>Pré-autorisation {tk.preAuth} {hotel.currencySymbol}</p>
                <GoldBadge>Tokenisé ✓</GoldBadge>
              </div>
            </GlassCard>
          ))}
        </div>
        <p className="text-white/30 text-[10px] mt-2">Aucune donnée carte brute n'est stockée — seules des références tokenisées transitent dans le PMS, conformément aux exigences PCI-DSS.</p>
      </div>
    </div>
  );
}
