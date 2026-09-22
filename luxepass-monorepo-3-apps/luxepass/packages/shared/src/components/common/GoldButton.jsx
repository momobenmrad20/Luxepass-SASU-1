import { gold, goldDark } from "./theme";

// Extrait tel quel de LuxePass.jsx (lignes 1375-1388 d'origine) — aucun
// changement de logique, de props ou de nom.
export default function GoldButton({ children, onClick, className = "", disabled = false, variant = "primary" }) {
  const base = "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed";
  const variants = {
    primary: `text-black hover:opacity-90 active:scale-95`,
    ghost: `border hover:bg-white/5`,
    danger: `bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30`,
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}
      style={variant === "primary" ? { background: `linear-gradient(135deg, ${gold}, ${goldDark})` } : variant === "ghost" ? { borderColor: "rgba(212,175,55,0.3)", color: gold } : {}}>
      {children}
    </button>
  );
}
