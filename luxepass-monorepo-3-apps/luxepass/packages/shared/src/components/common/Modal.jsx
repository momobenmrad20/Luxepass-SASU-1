import { X } from "lucide-react";
import GlassCard from "./GlassCard";

// Extrait tel quel de LuxePass.jsx (lignes 1408-1421 d'origine) — aucun
// changement de logique, de props ou de nom.
export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <GlassCard className="w-full max-w-md p-6 relative" style={{ borderColor: "rgba(212,175,55,0.3)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
          <X size={18} />
        </button>
        {title && <h3 className="text-lg font-bold text-white mb-4">{title}</h3>}
        {children}
      </GlassCard>
    </div>
  );
}
