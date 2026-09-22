import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldButton from "@shared/components/common/GoldButton";
import { useI18n } from "@shared/hooks/useI18n";
import { useAuth } from "@shared/hooks/useAuth";

// Extrait tel quel de LuxePass.jsx (lignes 5226-5252 d'origine) — aucun
// changement de logique, de props, d'état ou de nom.
export default function StaffLoginScreen() {
  const { t } = useI18n();
  const { loginStaff: onLogin, staffLoginLoading: loading, staffLoginError: error } = useAuth();
  const [email, setEmail] = useState("reception@ocean-a-suites.tn");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#080808" }}>
      <GlassCard className="p-6 w-full max-w-sm space-y-4">
        <div className="text-center">
          <ShieldCheck size={28} style={{ color: gold }} className="mx-auto mb-2" />
          <h2 className="text-white font-semibold">Connexion staff</h2>
          <p className="text-white/40 text-xs mt-1">Accès au back-office PMS de l'hôtel</p>
        </div>
        <div className="space-y-2">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
            className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe"
            className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <GoldButton className="w-full py-2.5" disabled={loading || !email || !password} onClick={() => onLogin(email, password)}>
          {loading ? "Connexion…" : "Se connecter"}
        </GoldButton>
        <p className="text-white/25 text-[10px] text-center">Démo : reception@ocean-a-suites.tn / password123</p>
      </GlassCard>
    </div>
  );
}
