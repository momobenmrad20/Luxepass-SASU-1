import { ChevronLeft, Check, Wifi, Sparkles, Wrench, BrainCircuit, Phone, Droplets, Zap, Snowflake, Mic, Camera } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldButton from "@shared/components/common/GoldButton";
import GoldBadge from "@shared/components/common/GoldBadge";
import { useI18n } from "@shared/hooks/useI18n";
import { useMaintenance } from "@shared/hooks/useMaintenance";

// Onglet « maintenance » de ClientDashboard — composant de présentation :
// l'état du signalement (incident*, micListening, refs) et ses handlers
// vivent dans hooks/useMaintenance.js. Rendu inchangé.

export default function MaintenanceReport({ room, pushMaintenance }) {
  const { t } = useI18n();
  const {
    incidentText, setIncidentText, incidentAnalyzing, incidentReport,
    incidentType, setIncidentType, incidentPhoto, incidentPhotoRef, micListening,
    analyzeIncident, resetIncident, startVoiceInput, handlePhotoSelect,
  } = useMaintenance({ room, pushMaintenance });


  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-lg">{t.maintenance}</h3>

      {/* ÉTAT 1 : confirmation après envoi */}
      {incidentReport ? (
        <GlassCard className="p-6 space-y-4 text-center" style={{ borderColor: "rgba(52,211,153,0.4)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(52,211,153,0.15)" }}>
            <Check size={32} style={{ color: "#34d399" }} />
          </div>
          <div>
            <p className="text-white text-lg font-bold">{t.ticketSent}</p>
            <p className="text-white/50 text-sm mt-1">{t.ticketSentSub}</p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <GoldBadge>#{incidentReport.ticket}</GoldBadge>
          </div>
          {incidentReport.photo && (
            <img src={incidentReport.photo} alt="" className="w-24 h-24 object-cover rounded-xl mx-auto" />
          )}
          <p className="text-white/70 text-sm">{incidentReport.equipment}</p>
          <p className="text-emerald-400 text-sm font-medium">{incidentReport.solution}</p>
          <button onClick={resetIncident}
            className="w-full py-3 rounded-xl text-sm font-semibold border"
            style={{ borderColor: "rgba(212,175,55,0.3)", color: gold }}>
            {t.newRequest}
          </button>
        </GlassCard>

      /* ÉTAT 2 : analyse en cours */
      ) : incidentAnalyzing ? (
        <GlassCard className="p-8 text-center space-y-4">
          <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: gold, borderTopColor: "transparent" }} />
          <p className="text-white/60 text-sm">{t.analyzeAI}...</p>
        </GlassCard>

      /* ÉTAT 3 : choix du problème (grille d'icônes larges) ou saisie libre si "Autre" */
      ) : incidentType !== "other" || incidentType === null ? (
        <>
          <p className="text-white/50 text-sm -mt-2">{t.maintenanceIntroSub}</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "ac", label: t.issueAC, icon: Snowflake },
              { key: "wifi", label: t.issueWifi, icon: Wifi },
              { key: "plumbing", label: t.issuePlumbing, icon: Droplets },
              { key: "elec", label: t.issueElec, icon: Zap },
              { key: "cleaning", label: t.issueCleaning, icon: Sparkles },
            ].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => analyzeIncident(key)}
                className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl transition-all active:scale-95"
                style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)" }}>
                <Icon size={30} style={{ color: gold }} />
                <span className="text-white text-sm font-medium text-center px-1">{label}</span>
              </button>
            ))}
            <button onClick={() => setIncidentType("other")}
              className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl transition-all active:scale-95"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <Wrench size={30} className="text-white/70" />
              <span className="text-white text-sm font-medium text-center px-1">{t.issueOther}</span>
            </button>
          </div>
        </>

      /* ÉTAT 4 : "Autre" — texte libre + micro + photo */
      ) : (
        <div className="space-y-3">
          <button onClick={() => setIncidentType(null)} className="flex items-center gap-1 text-xs text-white/40">
            <ChevronLeft size={14} /> {t.back}
          </button>
          <p className="text-white/50 text-sm">{t.otherDescribe}</p>
          <GlassCard className="p-4">
            <textarea value={incidentText} onChange={e => setIncidentText(e.target.value)}
              placeholder={t.describeIssue} rows={4}
              className="w-full bg-transparent text-white text-base placeholder-white/30 focus:outline-none resize-none" />
          </GlassCard>

          <div className="flex gap-3">
            <button onClick={startVoiceInput}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-semibold"
              style={micListening
                ? { background: "rgba(212,175,55,0.9)", color: "#000" }
                : { background: "rgba(255,255,255,0.06)", color: "white", border: "1px solid rgba(255,255,255,0.15)" }}>
              <Mic size={18} /> {micListening ? t.micListening : t.micStart}
            </button>
            <button onClick={() => incidentPhotoRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(255,255,255,0.06)", color: "white", border: "1px solid rgba(255,255,255,0.15)" }}>
              <Camera size={18} /> {incidentPhoto ? t.photoAdded : t.addPhoto}
            </button>
            <input ref={incidentPhotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
          </div>
          {incidentPhoto && <img src={incidentPhoto} alt="" className="w-20 h-20 object-cover rounded-xl" />}

          <GoldButton className="w-full py-4 text-base" onClick={() => analyzeIncident("other")} disabled={!incidentText && !incidentPhoto}>
            <BrainCircuit size={18} /> {t.sendRequest}
          </GoldButton>
        </div>
      )}

      {/* Filet de sécurité toujours visible : appeler un humain directement */}
      {!incidentReport && (
        <a href="tel:+21672000000"
          className="w-full flex items-center gap-3 p-4 rounded-2xl mt-2"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,175,55,0.15)" }}>
            <Phone size={20} style={{ color: gold }} />
          </div>
          <div className="text-left">
            <p className="text-white text-sm font-semibold">{t.callReceptionNow}</p>
            <p className="text-white/40 text-xs">{t.callReceptionSub}</p>
          </div>
        </a>
      )}
    </div>
  );
}
