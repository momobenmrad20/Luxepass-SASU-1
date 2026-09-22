import { useState } from "react";
import { Shield } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldButton from "@shared/components/common/GoldButton";
import { useAdminAuth } from "../hooks/useAdminAuth";

// NOUVEAU (créé lors du split en 3 apps) — sur le modèle de
// StaffLoginScreen.jsx, pour combler l'absence totale d'authentification
// qu'avait l'ancien rôle "admin" de la SPA unique.
export default function AdminLoginScreen() {
  const { login, loginLoading: loading, loginError: error } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#080808" }}>
      <GlassCard className="p-6 w-full max-w-sm space-y-4">
        <div className="text-center">
          <Shield size={28} style={{ color: gold }} className="mx-auto mb-2" />
          <h2 className="text-white font-semibold">Super Admin</h2>
          <p className="text-white/40 text-xs mt-1">Accès réservé à l'équipe LuxePass</p>
        </div>
        <div className="space-y-2">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
            className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe"
            className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <GoldButton className="w-full py-2.5" disabled={loading || !email || !password} onClick={() => login(email, password)}>
          {loading ? "Connexion…" : "Se connecter"}
        </GoldButton>
      </GlassCard>
    </div>
  );
}
