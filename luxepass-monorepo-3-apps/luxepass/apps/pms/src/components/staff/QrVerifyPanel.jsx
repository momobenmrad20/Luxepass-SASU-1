import { useState, useRef, useEffect } from "react";
import { AlertTriangle, Camera, Check, QrCode, X } from "lucide-react";
import { ApiError, checkinApi } from "@shared/api/apiClient";
import { decodeQrPayload } from "@shared/api/qrPayload";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldButton from "@shared/components/common/GoldButton";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// PMS MODULE — CHECK-IN / CHECK-OUT MANUEL (réceptionniste)
// ─────────────────────────────────────────────────────────────
// Vérification d'un pass QR par la réception : lecteur USB (saisie
// clavier + Entrée), collage du contenu, ou caméra (BarcodeDetector,
// Chrome/Android ; getUserMedia exige HTTPS ou localhost).
export default function QrVerifyPanel() {
  const [input, setInput] = useState("");
  const [state, setState] = useState({ kind: "idle" });
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const canScan = typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;

  const verify = async (raw) => {
    const parsed = decodeQrPayload(raw);
    if (!parsed) { setState({ kind: "bad_format" }); return; }
    if (!parsed.qrToken) { setState({ kind: "no_token" }); return; }
    setState({ kind: "loading" });
    try {
      // GET /stays/:stayId/qr-verify?token=… → { valid, guestName?, room? }
      const res = await checkinApi.verifyStayQr(parsed.stayId, parsed.qrToken);
      setState(res?.valid ? { kind: "valid", guestName: res.guestName, room: res.room } : { kind: "invalid" });
    } catch (err) {
      setState({ kind: "error", message: err instanceof ApiError ? err.message : "Vérification impossible" });
    }
  };

  useEffect(() => {
    if (!scanning) return;
    let stream = null;
    let raf = 0;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped) { stream.getTracks().forEach(tr => tr.stop()); return; }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const tick = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(video);
            if (codes.length > 0) {
              setScanning(false);
              setInput(codes[0].rawValue);
              verify(codes[0].rawValue);
              return;
            }
          } catch { /* image pas encore prête : on réessaie */ }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setScanning(false);
        setState({ kind: "error", message: "Caméra indisponible (autorisation refusée ou page non sécurisée)." });
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach(tr => tr.stop());
    };
  }, [scanning]);

  return (
    <GlassCard className="p-4 space-y-3">
      <div>
        <h3 className="text-white font-semibold flex items-center gap-2"><QrCode size={16} style={{ color: gold }} />Vérifier un pass QR</h3>
        <p className="text-white/40 text-xs mt-1">Scannez le QR du client (lecteur ou caméra) ou collez son contenu.</p>
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && input.trim()) verify(input); }}
          placeholder="Contenu du QR…"
          className="flex-1 min-w-0 bg-white/5 border rounded-xl px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none"
          style={{ borderColor: "rgba(212,175,55,0.2)" }} />
        <GoldButton className="text-xs px-3" disabled={!input.trim() || state.kind === "loading"} onClick={() => verify(input)}>
          {state.kind === "loading" ? "…" : "Vérifier"}
        </GoldButton>
        {canScan && (
          <GoldButton variant="ghost" className="px-3" onClick={() => setScanning(v => !v)}>
            <Camera size={14} />
          </GoldButton>
        )}
      </div>
      {scanning && (
        <video ref={videoRef} playsInline muted className="w-full rounded-xl bg-black" style={{ maxHeight: 260 }} />
      )}
      {state.kind === "valid" && (
        <p className="text-sm flex items-center gap-2" style={{ color: "#4ade80" }}>
          <Check size={16} />Pass valide{state.guestName ? ` — ${state.guestName}` : ""}{state.room ? ` · Chambre ${state.room}` : ""}
        </p>
      )}
      {state.kind === "invalid" && (
        <p className="text-sm text-red-400 flex items-center gap-2"><X size={16} />Pass invalide ou falsifié.</p>
      )}
      {state.kind === "bad_format" && (
        <p className="text-sm text-red-400 flex items-center gap-2"><AlertTriangle size={16} />Ce contenu n'est pas un QR LuxePass.</p>
      )}
      {state.kind === "no_token" && (
        <p className="text-sm text-red-400 flex items-center gap-2"><AlertTriangle size={16} />QR sans jeton de sécurité : impossible à vérifier.</p>
      )}
      {state.kind === "error" && (
        <p className="text-sm text-red-400 flex items-center gap-2"><AlertTriangle size={16} />{state.message}</p>
      )}
    </GlassCard>
  );
}
