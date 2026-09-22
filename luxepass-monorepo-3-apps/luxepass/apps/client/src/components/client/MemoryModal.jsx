import { Eye, ShieldCheck, Trash2 } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GoldButton from "@shared/components/common/GoldButton";
import Modal from "@shared/components/common/Modal";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// MODULE 6 — TRANSPARENCE & CONTRÔLE (mémoire IA)
// ─────────────────────────────────────────────────────────────
export default function MemoryModal({ open, onClose, memory, onClear }) {
  const { t, lang } = useI18n();
  return (
    <Modal open={open} onClose={onClose} title={t.memoryTitle}>
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck size={14} style={{ color: gold }} />
        <p className="text-xs text-white/40">{t.privacyNote}</p>
      </div>
      <p className="text-xs uppercase tracking-wider text-white/40 mb-2">{t.learnedPrefs}</p>
      {memory.length === 0 ? (
        <p className="text-sm text-white/50 py-4 text-center">{t.noPrefsYet}</p>
      ) : (
        <div className="space-y-2 mb-4">
          {memory.map(m => (
            <div key={m.id} className="flex items-start gap-2 bg-white/5 rounded-xl p-3">
              <Eye size={13} style={{ color: gold }} className="mt-0.5 flex-shrink-0" />
              <p className="text-xs text-white/70 leading-relaxed">{m[lang] || m.fr}</p>
            </div>
          ))}
        </div>
      )}
      <GoldButton variant="ghost" className="w-full" onClick={onClear}>
        <Trash2 size={14} /> {t.clearMemory}
      </GoldButton>
    </Modal>
  );
}
