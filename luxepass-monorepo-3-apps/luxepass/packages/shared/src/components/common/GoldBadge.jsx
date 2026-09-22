import { gold } from "./theme";

// Extrait tel quel de LuxePass.jsx (lignes 1356-1363 d'origine) — aucun
// changement de logique, de props ou de nom.
export default function GoldBadge({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}
      style={{ background: "rgba(212,175,55,0.15)", color: gold, border: `1px solid rgba(212,175,55,0.3)` }}>
      {children}
    </span>
  );
}
