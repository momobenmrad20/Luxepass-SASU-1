import { useState } from "react";
import { Check, ChevronRight, ShieldCheck, Upload } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldBadge from "@shared/components/common/GoldBadge";
import { useLiveFeed } from "@shared/hooks/useLiveFeed";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// PMS MODULE — FICHES POLICE (regroupées depuis le check-in client)
// ─────────────────────────────────────────────────────────────
export default function PoliceRecords() {
  const { t } = useI18n();
  const { digitalActiveStays } = useLiveFeed();
  const [selected, setSelected] = useState(null);
  let records = [];
  let debugError = null;
  try {
    records = (digitalActiveStays || [])
      .filter(s => s.stage === "completed" && s.guestData)
      .map(s => ({
        id: s.stayId,
        firstName: s.guestData.firstName,
        lastName: s.guestData.lastName,
        room: s.room || "—",
        idNumber: s.guestData.idNumber,
        age: s.guestData.age,
        gender: s.guestData.gender,
        profession: s.guestData.profession,
        from: s.guestData.from,
        destination: s.guestData.destination,
        arrival: s.guestData.arrival,
        departure: s.guestData.departure,
        hasSignature: !!s.signatureDataUrl,
        submittedAt: s.completedAt,
      }));
  } catch (e) {
    debugError = e.message;
              }

  const formatDate = (iso) => {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  return (
    <>
    {debugError && (<div style={{ background: "red", color: "white", padding: 16 }}>ERREUR : {debugError}</div>)}
    <div className="space-y-4">
      <div>
        <h3 className="text-white font-semibold flex items-center gap-2"><ShieldCheck size={16} style={{ color: gold }} />{t.policeRecords}</h3>
        <p className="text-white/40 text-xs mt-0.5">{t.policeRecordsSub}</p>
      </div>

      {records.length === 0 ? (
        <GlassCard className="p-6 text-center text-white/40 text-sm">{t.noRecords}</GlassCard>
      ) : (
        <div className="space-y-2">
          {records.map(r => (
            <GlassCard key={r.id} onClick={() => setSelected(r)} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium text-sm">{r.firstName} {r.lastName}</p>
                  <p className="text-white/40 text-xs">{t.room} {r.room} • {r.idNumber}</p>
                </div>
                <div className="flex items-center gap-2">
                  {r.hasSignature && <GoldBadge><Check size={10} />{t.signatureCaptured}</GoldBadge>}
                  <ChevronRight size={14} className="text-white/30" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.firstName} ${selected.lastName}` : ""}>
        {selected && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-white/40">{t.idNumber}</p><p className="text-white text-sm">{selected.idNumber}</p></div>
              <div><p className="text-xs text-white/40">{t.age}</p><p className="text-white text-sm">{selected.age}</p></div>
              <div><p className="text-xs text-white/40">{t.gender}</p><p className="text-white text-sm">{selected.gender}</p></div>
              <div><p className="text-xs text-white/40">{t.profession}</p><p className="text-white text-sm">{selected.profession}</p></div>
              <div><p className="text-xs text-white/40">{t.from}</p><p className="text-white text-sm">{selected.from}</p></div>
              <div><p className="text-xs text-white/40">{t.destination}</p><p className="text-white text-sm">{selected.destination}</p></div>
              <div><p className="text-xs text-white/40">{t.arrival}</p><p className="text-white text-sm">{selected.arrival}</p></div>
              <div><p className="text-xs text-white/40">{t.departure}</p><p className="text-white text-sm">{selected.departure}</p></div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <GoldBadge><Upload size={10} />{t.idDocument} ✓</GoldBadge>
              {selected.hasSignature && <GoldBadge><Check size={10} />{t.signatureCaptured}</GoldBadge>}
            </div>
            <p className="text-xs text-white/30">{t.submittedOn}: {formatDate(selected.submittedAt)}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
