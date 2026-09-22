import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { gold } from "./theme";
import GoldButton from "./GoldButton";
import { useI18n } from "../../hooks/useI18n";

// Extrait tel quel de LuxePass.jsx (lignes 1471-1536 d'origine) — aucun
// changement de logique, de props, d'état ou de nom.
export default function SignatureCanvas({ onSave }) {
  const { t } = useI18n();
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [signed, setSigned] = useState(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const start = (e) => {
    drawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setSigned(false);
  };

  const draw = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = gold;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stop = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
  };

  const save = () => {
    const data = canvasRef.current.toDataURL("image/png");
    onSave(data);
    setSigned(true);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-white/50 text-sm">{t.signHere}</p>
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: "rgba(212,175,55,0.3)", background: "rgba(255,255,255,0.03)" }}>
        <canvas ref={canvasRef} width={340} height={160}
          onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={stop}
          className="cursor-crosshair block" />
      </div>
      <div className="flex gap-3">
        <GoldButton onClick={clear} variant="ghost">{t.clearSig}</GoldButton>
        <GoldButton onClick={save}>
          {signed ? <><Check size={16} /> {t.confirmSig}</> : t.confirmSig}
        </GoldButton>
      </div>
    </div>
  );
}
