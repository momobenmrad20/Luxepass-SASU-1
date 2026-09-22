import { useState } from "react";
import { BadgeCheck, FileText, RefreshCw, Send } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import { useAppState } from "@shared/hooks/useAppState";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// MODULE 7 — CONFORMITÉ RÉGLEMENTAIRE (télédéclaration police/immigration)
// ─────────────────────────────────────────────────────────────
export default function ComplianceCenter() {
  const { t } = useI18n();
  const { appState, setAppState } = useAppState();
  const [sending, setSending] = useState(null);
  const records = appState.policeForms || [];
  const teleStatus = appState.teleDeclarationStatus || {};

  const declare = (id) => {
    setSending(id);
    setTimeout(() => {
      setAppState(prev => ({
        ...prev,
        teleDeclarationStatus: { ...(prev.teleDeclarationStatus || {}), [id]: "accepted" },
        auditLog: [{ id: `al_${Date.now()}`, action: `Télédéclaration police envoyée — fiche ${id}`, time: "à l'instant" }, ...(prev.auditLog || [])],
      }));
      setSending(null);
    }, 1600);
  };

  const statusLabel = (s) => s === "accepted" ? "Acceptée par les autorités" : s === "pending" ? "En cours d'envoi" : "Non télédéclarée";
  const statusColor = (s) => s === "accepted" ? "#34d399" : s === "pending" ? "#fbbf24" : "rgba(255,255,255,0.3)";

  return (
    <div className="space-y-4">
      <GlassCard className="p-4" style={{ borderColor: "rgba(212,175,55,0.3)" }}>
        <p className="text-white font-semibold text-sm flex items-center gap-2 mb-1"><FileText size={15} style={{ color: gold }} />Télédéclaration Police & Immigration</p>
        <p className="text-white/40 text-xs">Transmission automatique des fiches clients au portail officiel de la Direction Générale de la Sûreté Nationale, conformément à la réglementation en vigueur.</p>
      </GlassCard>

      {records.length === 0 ? (
        <GlassCard className="p-6 text-center text-white/40 text-sm">Aucune fiche à télédéclarer.</GlassCard>
      ) : (
        <div className="space-y-2">
          {records.map(r => {
            const status = teleStatus[r.id] || "none";
            return (
              <GlassCard key={r.id} className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{r.firstName} {r.lastName}</p>
                  <p className="text-xs" style={{ color: statusColor(status) }}>{statusLabel(status)}</p>
                </div>
                {status !== "accepted" && (
                  <button onClick={() => declare(r.id)} disabled={sending === r.id}
                    className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0" style={{ background: "rgba(212,175,55,0.15)", color: gold }}>
                    {sending === r.id ? <><RefreshCw size={11} className="animate-spin" />Envoi...</> : <><Send size={11} />Télédéclarer</>}
                  </button>
                )}
                {status === "accepted" && <BadgeCheck size={18} className="text-emerald-400 flex-shrink-0" />}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
