import { useMemo } from "react";
import qrcode from "qrcode-generator";
import { gold } from "@shared/components/common/theme";

// ─────────────────────────────────────────────────────────────
// DigitalPass.jsx — le Pass Digital du client : le QR code de son séjour
// (QRCodeDisplay) et la carte bancaire virtuelle affichée en fin de
// check-in (PremiumCard). Les deux étaient déjà des fonctions séparées
// dans LuxePass.jsx ; regroupées ici tel quel (aucun changement de
// logique, de props ou de nom), car utilisées ensemble à l'écran final
// de CheckInFlow, et QRCodeDisplay seule dans la modale "payer via QR"
// de ClientDashboard.
// ─────────────────────────────────────────────────────────────

// Extrait tel quel de LuxePass.jsx (lignes 1428-1466 d'origine).
// Vrai QR code (bibliothèque qrcode-generator, niveau de correction M).
// `value` = texte à encoder (voir qrPayload.js) ; `caption` = légende
// optionnelle (ne jamais y mettre le jeton HMAC).
export function QRCodeDisplay({ value, caption }) {
  const QUIET = 4; // marge blanche (en modules) exigée par la norme QR
  const { count, path } = useMemo(() => {
    if (!value) return { count: 0, path: "" };
    try {
      const q = qrcode(0, "M"); // 0 = taille (version) choisie automatiquement
      q.addData(String(value));
      q.make();
      const n = q.getModuleCount();
      let d = "";
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
        }
      }
      return { count: n, path: d };
    } catch {
      return { count: 0, path: "" }; // contenu trop long pour un QR
    }
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="p-3 rounded-2xl bg-white">
        {count > 0 ? (
          <svg width={176} height={176} viewBox={`${-QUIET} ${-QUIET} ${count + 2 * QUIET} ${count + 2 * QUIET}`}
            shapeRendering="crispEdges" role="img" aria-label="QR code du pass de séjour">
            <path d={path} fill="#0a0a0a" />
          </svg>
        ) : (
          <div className="flex items-center justify-center text-xs text-black/50" style={{ width: 176, height: 176 }}>
            QR indisponible
          </div>
        )}
      </div>
      {caption && <p className="text-xs text-white/40 font-mono">{caption}</p>}
    </div>
  );
}

// Extrait tel quel de LuxePass.jsx (lignes 1541-1569 d'origine).
export function PremiumCard({ number, holder, expiry }) {
  const fmt = (n) => n.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim() || "•••• •••• •••• ••••";
  return (
    <div className="relative w-80 h-48 rounded-2xl overflow-hidden shadow-2xl select-none"
      style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(212,175,55,0.2), transparent 60%)" }} />
      <div className="absolute top-4 right-4 w-12 h-8 rounded-md" style={{ background: "linear-gradient(135deg, #D4AF37, #8B6914)", opacity: 0.9 }} />
      <div className="absolute bottom-6 left-6 right-6">
        <p className="font-mono text-white/90 text-lg tracking-widest mb-3">{fmt(number)}</p>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wider">Titulaire</p>
            <p className="text-white font-medium text-sm">{holder || "VOTRE NOM"}</p>
          </div>
          <div className="text-right">
            <p className="text-white/40 text-xs uppercase tracking-wider">Expire</p>
            <p className="text-white font-medium text-sm">{expiry || "MM/YY"}</p>
          </div>
        </div>
      </div>
      <div className="absolute top-4 left-6">
        <div className="flex gap-1">
          <div className="w-8 h-8 rounded-full" style={{ background: gold, opacity: 0.8 }} />
          <div className="w-8 h-8 rounded-full -ml-4" style={{ background: "#C0392B", opacity: 0.6 }} />
        </div>
      </div>
    </div>
  );
}
