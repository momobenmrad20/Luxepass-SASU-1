// Extrait tel quel de LuxePass.jsx (lignes 1365-1374 d'origine) — aucun
// changement de logique, de props ou de nom.
export default function GlassCard({ children, className = "", onClick, style = {} }) {
  return (
    <div onClick={onClick}
      className={`rounded-2xl border transition-all duration-300 ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""} ${className}`}
      style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px)", borderColor: "rgba(212,175,55,0.15)", ...style }}>
      {children}
    </div>
  );
}
