// @ts-check
import { useRef, useState } from "react";
import { useI18n } from "./useI18n";

/**
 * Signalement maintenance côté client (onglet « maintenance ») : machine à
 * états de l'incident (choix du problème → « Autre » en texte libre avec
 * micro + photo → analyse simulée → ticket), sans aucun rendu.
 *
 * Extrait tel quel de MaintenanceReport — même logique, mêmes noms.
 * L'envoi réel (état PMS + POST /stays/:stayId/maintenance) reste dans
 * `pushMaintenance`, fourni par ClientDashboard : il partage actionError et
 * refreshMyRequests avec les autres actions du séjour et sera repris par
 * useServiceRequests. Ce hook ne fait que l'appeler avec le rapport.
 *
 * Comportement identique à l'ancien : l'état est local au composant qui
 * appelle le hook, donc réinitialisé quand on quitte l'onglet.
 *
 * @param {{ room: string, pushMaintenance: (report: import("../types").IncidentReport) => void | Promise<void> }} args
 * @returns {import("../types").UseMaintenanceValue}
 */
export function useMaintenance({ room, pushMaintenance }) {
  const { t, lang } = useI18n();
  const [incidentText, setIncidentText] = useState("");
  const [incidentAnalyzing, setIncidentAnalyzing] = useState(false);
  const [incidentReport, setIncidentReport] = useState(null);
  const [incidentType, setIncidentType] = useState(null);
  const [incidentPhoto, setIncidentPhoto] = useState(null);
  const [micListening, setMicListening] = useState(false);
  const incidentPhotoRef = useRef(null);
  const recognitionRef = useRef(null);

  const ISSUE_REPORTS = {
    ac: { equipment: `Climatiseur — Chambre ${room}`, issue: "Panne détectée : Compresseur défaillant (Code E7)", eta: "2h30" },
    wifi: { equipment: `Réseau Wifi — Chambre ${room}`, issue: "Signal faible détecté sur le point d'accès le plus proche", eta: "30 min" },
    plumbing: { equipment: `Salle de bain — Chambre ${room}`, issue: "Fuite ou obstruction signalée", eta: "1h" },
    elec: { equipment: `Installation électrique / TV — Chambre ${room}`, issue: "Anomalie électrique ou TV signalée", eta: "1h" },
    cleaning: { equipment: `Chambre ${room}`, issue: "Ménage supplémentaire demandé", eta: "45 min" },
    other: { equipment: `Chambre ${room}`, issue: incidentText || "Problème signalé par le client", eta: "1h" },
  };

  const analyzeIncident = (type = "other") => {
    setIncidentType(type);
    setIncidentAnalyzing(true);
    setTimeout(() => {
      setIncidentAnalyzing(false);
      const base = ISSUE_REPORTS[type] || ISSUE_REPORTS.other;
      const report = {
        equipment: base.equipment,
        issue: base.issue,
        solution: `Intervention technicien en cours — ${t.etaLabel} : ${base.eta}`,
        ticket: `INC-${Date.now().toString().slice(-6)}`,
        photo: incidentPhoto,
      };
      setIncidentReport(report);
      pushMaintenance(report);
    }, 1800);
  };

  const resetIncident = () => {
    setIncidentReport(null);
    setIncidentType(null);
    setIncidentText("");
    setIncidentPhoto(null);
  };

  const startVoiceInput = () => {
    const w = /** @type {any} */ (window); // API non typée dans lib.dom
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = lang === "ar" ? "ar-TN" : lang === "en" ? "en-US" : "fr-FR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setMicListening(true);
    recognition.onend = () => setMicListening(false);
    recognition.onerror = () => setMicListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) setIncidentText(prev => (prev ? prev + " " : "") + transcript);
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setIncidentPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  return {
    incidentText, setIncidentText,
    incidentAnalyzing, incidentReport,
    incidentType, setIncidentType,
    incidentPhoto, incidentPhotoRef,
    micListening,
    analyzeIncident, resetIncident, startVoiceInput, handlePhotoSelect,
  };
}
