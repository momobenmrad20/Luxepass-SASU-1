import { useRef } from "react";
import { Star, Check, AlertTriangle, Upload, ChevronRight, ChevronLeft, QrCode } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GoldBadge from "@shared/components/common/GoldBadge";
import GlassCard from "@shared/components/common/GlassCard";
import GoldButton from "@shared/components/common/GoldButton";
import SignatureCanvas from "@shared/components/common/SignatureCanvas";
import { QRCodeDisplay, PremiumCard } from "../pass/DigitalPass";
import { useI18n } from "@shared/hooks/useI18n";
import { useCheckIn } from "@shared/hooks/useCheckIn";
import { CONCIERGE_PACKAGE, computeConciergePrice } from "@shared/utils/checkin";

// Assistant de check-in — composant de présentation : le parcours (session,
// scan, données, signature, paiement, QR) vit dans hooks/useCheckIn.js et les
// fonctions pures (forfait conciergerie, marque de carte, normalisation) dans
// utils/checkin.js. Rendu inchangé.
export default function CheckInFlow({ hotel, onComplete }) {
  const { t } = useI18n();
  const {
    step, setStep,
    initializing, initError,
    scanning, scanned, scanError, handleFileSelected,
    guestData, setGuestData, guestDataError, handleConfirmGuestData,
    signature, setSignature, signatureError, handleConfirmSignature,
    card, setCard, conciergeOptIn, setConciergeOptIn, conciergeAdded,
    qrPayload, stayId, paymentError, generateQR,
    submitting,
  } = useCheckIn({ hotel });
  const fileRef = useRef(null);

  const fieldClass = "w-full bg-white/5 border rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 transition-all";
  const fieldStyle = { borderColor: "rgba(212,175,55,0.2)" };
  const focusStyle = { "--tw-ring-color": gold };

  const steps = [t.step1, t.step2, t.step3];

  // Session pas encore prête : on bloque l'écran plutôt que de laisser
  // l'utilisateur avancer sans sessionToken valide.
  if (initializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#080808" }}>
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: gold, borderTopColor: "transparent" }} />
        <p className="text-white/50 text-sm">Connexion à l'hôtel…</p>
      </div>
    );
  }
  if (initError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: "#080808" }}>
        <AlertTriangle size={32} className="text-red-400" />
        <p className="text-white/70 text-sm">{initError}</p>
        <GoldButton onClick={() => window.location.reload()}>Réessayer</GoldButton>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: "linear-gradient(135deg, #080808 0%, #0f0f0f 100%)" }}>
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <GoldBadge><Star size={12} />{hotel.name}</GoldBadge>
          <h2 className="text-2xl font-bold text-white mt-3">{t.checkIn}</h2>
        </div>

        {/* Step progress */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                  style={i < step ? { background: gold, color: "#000" } : i === step ? { background: "rgba(212,175,55,0.2)", color: gold, border: `2px solid ${gold}` } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", border: "2px solid rgba(255,255,255,0.1)" }}>
                  {i < step ? <Check size={16} /> : i + 1}
                </div>
                <span className="text-xs text-white/40 text-center w-20">{s}</span>
              </div>
              {i < 2 && <div className="flex-1 h-px mx-2" style={{ background: i < step ? gold : "rgba(255,255,255,0.1)" }} />}
            </div>
          ))}
        </div>

        <GlassCard className="p-6" style={{ borderColor: "rgba(212,175,55,0.2)" }}>

          {/* STEP 0: ID SCAN */}
          {step === 0 && (
            <div className="space-y-5">
              {!scanned ? (
                <div>
                  <div onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-opacity-60 transition-all"
                    style={{ borderColor: "rgba(212,175,55,0.3)", background: "rgba(212,175,55,0.03)" }}>
                    <input ref={fileRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileSelected} />
                    {scanning ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: gold, borderTopColor: "transparent" }} />
                        <p className="text-sm font-medium" style={{ color: gold }}>{t.analyzing}</p>
                        <div className="w-full space-y-2">
                          {[80, 60, 90, 50].map((w, i) => (
                            <div key={i} className="h-3 rounded-full animate-pulse" style={{ background: "rgba(212,175,55,0.15)", width: `${w}%` }} />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload size={36} style={{ color: gold }} />
                        <p className="text-white font-medium">{t.upload}</p>
                        <p className="text-white/40 text-xs text-center">{t.uploadSub}</p>
                      </>
                    )}
                  </div>
                  {scanError && (
                    <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                      <AlertTriangle size={12} />{scanError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                    <Check size={16} className="text-emerald-400" />{t.extracted}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "firstName", label: t.firstName }, { key: "lastName", label: t.lastName },
                      { key: "age", label: t.age }, { key: "gender", label: t.gender },
                      { key: "idNumber", label: t.idNumber }, { key: "profession", label: t.profession },
                      { key: "from", label: t.from }, { key: "destination", label: t.destination },
                      { key: "arrival", label: t.arrival }, { key: "departure", label: t.departure },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-xs text-white/40 mb-1">{label}</label>
                        <div className="relative">
                          <input value={guestData[key]} onChange={e => setGuestData(p => ({ ...p, [key]: e.target.value }))}
                            className={fieldClass} style={fieldStyle} />
                          <Check size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                        </div>
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs text-white/40 mb-1">{t.occupants}</label>
                      <input type="number" min={1} max={10} value={guestData.occupants}
                        onChange={e => setGuestData(p => ({ ...p, occupants: Math.max(1, Math.min(10, Number(e.target.value) || 1)) }))}
                        className={fieldClass} style={fieldStyle} />
                    </div>
                  </div>
                  {guestDataError && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertTriangle size={12} />{guestDataError}
                    </p>
                  )}
                  <GoldButton onClick={handleConfirmGuestData} disabled={submitting} className="w-full">
                    {submitting ? "Validation..." : <>{t.next} <ChevronRight size={16} /></>}
                  </GoldButton>
                </div>
              )}
            </div>
          )}

          {/* STEP 1: SIGNATURE */}
          {step === 1 && (
            <div className="space-y-5">
              <SignatureCanvas onSave={(data) => setSignature(data)} />
              {signatureError && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle size={12} />{signatureError}
                </p>
              )}
              <div className="flex gap-3">
                <GoldButton variant="ghost" onClick={() => setStep(0)}><ChevronLeft size={16} />{t.back}</GoldButton>
                <GoldButton className="flex-1" disabled={!signature || submitting} onClick={handleConfirmSignature}>
                  {submitting ? "Validation..." : <>{t.next} <ChevronRight size={16} /></>}
                </GoldButton>
              </div>
            </div>
          )}

          {/* STEP 2: PAYMENT */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Forfait Conciergerie & Bien-être — pré-coché, prix toujours
                  visible juste à côté (jamais seulement sur le folio après coup) */}
              {!qrPayload && (() => {
                const { nights, pax, total } = computeConciergePrice(guestData.arrival, guestData.departure, guestData.occupants);
                return (
                  <label className="flex items-start gap-3 p-3 rounded-xl cursor-pointer" style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)" }}>
                    <input type="checkbox" checked={conciergeOptIn} onChange={e => setConciergeOptIn(e.target.checked)} className="mt-0.5 flex-shrink-0" style={{ accentColor: gold }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-white text-sm font-medium">{t.conciergeAddonName}</p>
                        <p className="text-sm font-bold flex-shrink-0" style={{ color: gold }}>{total} {hotel.currencySymbol}</p>
                      </div>
                      <p className="text-white/40 text-xs mt-0.5">{t.conciergeAddonDesc}</p>
                      <p className="text-white/30 text-[10px] mt-1">{CONCIERGE_PACKAGE.pricePerNightPerPerson} {hotel.currencySymbol} × {nights} {nights > 1 ? t.nights : t.night} × {pax} {pax > 1 ? t.occupantsShort : t.occupantShort}</p>
                    </div>
                  </label>
                );
              })()}

              <div className="flex justify-center">
                <PremiumCard number={card.number} holder={card.holder} expiry={card.expiry} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-white/40 mb-1">{t.cardNumber}</label>
                  <input value={card.number} maxLength={19}
                    onChange={e => setCard(p => ({ ...p, number: e.target.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim() }))}
                    placeholder="1234 5678 9012 3456" className={fieldClass} style={fieldStyle} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-white/40 mb-1">{t.cardHolder}</label>
                  <input value={card.holder} onChange={e => setCard(p => ({ ...p, holder: e.target.value }))}
                    placeholder="NOM PRÉNOM" className={fieldClass} style={fieldStyle} />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1">{t.expiry}</label>
                  <input value={card.expiry} maxLength={5}
                    onChange={e => setCard(p => ({ ...p, expiry: e.target.value.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1/$2") }))}
                    placeholder="MM/YY" className={fieldClass} style={fieldStyle} />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1">{t.cvv}</label>
                  <input value={card.cvv} maxLength={3} type="password"
                    onChange={e => setCard(p => ({ ...p, cvv: e.target.value.replace(/\D/g, "") }))}
                    placeholder="•••" className={fieldClass} style={fieldStyle} />
                </div>
              </div>

              {paymentError && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle size={12} />{paymentError}
                </p>
              )}
              {!qrPayload ? (
                <GoldButton className="w-full" onClick={generateQR} disabled={card.number.length < 19 || submitting}>
                  <QrCode size={16} /> {submitting ? "Traitement..." : t.generateQR}
                </GoldButton>
              ) : (
                <div className="space-y-4">
                  <QRCodeDisplay value={qrPayload} caption={stayId ? `#${stayId.slice(-6)}` : undefined} />
                  {conciergeAdded && (
                    <p className="text-xs text-center flex items-center justify-center gap-1.5" style={{ color: gold }}>
                      <Check size={12} />{t.conciergeAddonName} — {conciergeAdded} {hotel.currencySymbol} {t.conciergeAddonAdded}
                    </p>
                  )}
                  <GoldButton className="w-full" onClick={onComplete}>
                    <Check size={16} /> {t.finish}
                  </GoldButton>
                </div>
              )}
              <GoldButton variant="ghost" onClick={() => setStep(1)}><ChevronLeft size={16} />{t.back}</GoldButton>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
