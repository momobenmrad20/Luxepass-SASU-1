// @ts-check
import { useEffect, useState } from "react";
import { ApiError, conciergeApi, stayApi } from "../api/apiClient";
import { INITIAL_MEMORY } from "../constants";
import { useAppState } from "./useAppState";
import { useI18n } from "./useI18n";

// Extrait tel quel de ClientDashboard (mémoire) et de ConciergeChat (chat) —
// même logique, mêmes noms. Deux hooks, car ils ne vivent pas au même endroit :
//  • useConciergeMemory : appelé dans ClientDashboard (la réhydratation des notes
//    doit se faire dès l'ouverture du dashboard, pas seulement à l'onglet concierge) ;
//  • useConcierge : appelé dans ConciergeChat (la conversation reste locale à
//    l'onglet, comme avant : elle repart de zéro quand on le quitte).

/**
 * Mémoire IA du séjour, partagée avec le PMS (Guest 360) via appState.memories.
 * @param {{ guest: import("../types").Guest }} args
 * @returns {import("../types").UseConciergeMemoryValue}
 */
export function useConciergeMemory({ guest }) {
  const { appState, setAppState } = useAppState();
  const guestId = guest?.guestId;

  // Mémoire IA partagée avec le PMS (Guest 360) — modules 2 & 6 branchés sur appState
  const memory = (appState?.memories && appState.memories[guestId]) || INITIAL_MEMORY;
  const setMemory = (updater) => setAppState(prev => {
    const current = (prev.memories && prev.memories[guestId]) || INITIAL_MEMORY;
    const next = typeof updater === "function" ? updater(current) : updater;
    return { ...prev, memories: { ...prev.memories, [guestId]: next } };
  });

  // Ajoute une note à la mémoire concierge — synchro locale (affichage
  // multilingue du chatbot demo) + sauvegarde réelle côté backend.
  const addMemoryNote = (entry) => {
    setMemory(p => [...p, entry]);
    // backendSynced: true = la note vient déjà d'être persistée côté serveur
    // (ex: memoryNote renvoyé par POST /stays/:stayId/concierge/messages) —
    // on ne la réécrit pas une deuxième fois pour éviter un doublon.
    if (guest?.stayId && !entry.backendSynced) stayApi.addNote(guest.stayId, entry.fr).catch(() => {});
  };

  // Réhydratation de la mémoire depuis le backend au chargement — jusqu'ici
  // stayApi.addNote() écrivait bien côté serveur mais rien ne relisait
  // jamais stayApi.listNotes(), donc un rechargement de page (ou une
  // ouverture depuis un autre appareil) perdait l'affichage des
  // préférences pourtant toujours en base. Les notes backend n'ont qu'un
  // texte en français (pas de fr/en/ar séparés) — on réutilise ce même
  // texte pour les trois clés, cohérent avec le fallback m[lang] || m.fr
  // déjà utilisé partout où `memory` est affichée.
  useEffect(() => {
    if (!guest?.stayId) return;
    let cancelled = false;
    stayApi.listNotes(guest.stayId)
      .then((res) => {
        if (cancelled) return;
        const notes = (res.notes || []).map(n => ({ id: n.id, fr: n.text, en: n.text, ar: n.text }));
        setAppState(prev => ({ ...prev, memories: { ...prev.memories, [guestId]: notes } }));
      })
      .catch(() => {}); // pas de mémoire backend disponible — on garde l'état local existant
    return () => { cancelled = true; };
  }, [guest?.stayId]);

  const clearMemory = () => {
    setMemory([]);
    if (guest?.stayId) stayApi.clearNotes(guest.stayId).catch(() => {});
  };

  return { memory, addMemoryNote, clearMemory };
}

// ── Itinéraire (données pures, aucun rendu) ──
/** Programme de la journée selon l'âge/la profession du client, dans la langue courante. */
export function buildItinerary(guest, lang) {
  const age = parseInt(guest?.age) || 0;
  const prof = (guest?.profession || "").toLowerCase();
  const isExec = prof.includes("directeur") || prof.includes("architecte") || prof.includes("ceo") || prof.includes("manager");
  const days = [];
  const L = (fr, en, ar) => (lang === "en" ? en : lang === "ar" ? ar : fr);
  days.push(L("Matin : petit-déjeuner en terrasse + Spa décompression", "Morning: terrace breakfast + decompression Spa", "الصباح: فطور على التراس + سبا للاسترخاء"));
  days.push(isExec
    ? L("Après-midi : accès Business Lounge + 18 trous de Golf privé", "Afternoon: Business Lounge access + private 18-hole Golf", "بعد الظهر: صالة أعمال + 18 حفرة غولف خاصة")
    : age < 35
      ? L("Après-midi : Tennis / Padel puis balade à Sidi Bou Saïd", "Afternoon: Tennis / Padel then a Sidi Bou Saïd walk", "بعد الظهر: تنس/بادل ثم جولة في سيدي بو سعيد")
      : L("Après-midi : visite guidée de la Médina de Tunis", "Afternoon: guided Tunis Medina tour", "بعد الظهر: جولة مرشدة في مدينة تونس"));
  days.push(L("Soir : dîner gastronomique à Dar El Jeld, transfert privé inclus", "Evening: fine dining at Dar El Jeld, private transfer included", "المساء: عشاء فاخر في دار الجلد مع نقل خاص"));
  return days;
}

/**
 * Conversation avec le concierge IA (messages, saisie, handoff humain, itinéraire,
 * ouverture des modales mémoire / découverte de la ville). Aucun rendu, aucun DOM :
 * le défilement automatique (scrollRef) reste dans ConciergeChat.
 * @param {{ guest: import("../types").Guest, pushTicket: Function, onMemoryNote?: Function, onClearMemory: Function }} args
 * @returns {import("../types").UseConciergeValue}
 */
export function useConcierge({ guest, pushTicket, onMemoryNote, onClearMemory }) {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState([
    { from: "ai", text: `${t.welcome} ${guest?.firstName || ""}. ${t.dir === "rtl" ? "أنا كونسيرجك الذكي، تحت تصرفك." : "Je suis votre concierge IA, à votre disposition."}` },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [handoff, setHandoff] = useState("none"); // none | transferring | connected
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [itinerary, setItinerary] = useState(null);

  // Phase 1 — appel réel au concierge IA (routes/concierge.routes.ts +
  // services/ai.service.ts côté backend). Remplace les anciennes réponses
  // scriptées : c'est le backend qui décide du sentiment, de ce qui doit
  // être mémorisé (personnalisation) et de ce qui doit devenir un ticket
  // staff (priorisation intelligente des demandes).
  //
  // guest.stayId est l'identifiant du séjour (voir CheckInFlow.generateQR()). Sans lui
  // (ex: aperçu staff/démo sans check-in réel), on retombe directement en
  // mode dégradé local sans tenter l'appel réseau.
  const respond = async (userText) => {
    setTyping(true);
    if (!guest?.stayId) {
      setTimeout(() => {
        setTyping(false);
        setMessages(p => [...p, { from: "ai", text: t.dir === "rtl" ? "تم التوصيل لفريقنا، وسنعود إليك خلال دقائق." : "C'est transmis à notre équipe, je reviens vers vous dans quelques minutes." }]);
        pushTicket(userText, "LOW");
      }, 900);
      return;
    }
    try {
      const result = await conciergeApi.sendMessage(guest.stayId, userText, lang);
      setTyping(false);
      setMessages(p => [...p, { from: "ai", text: result.reply }]);
      // La note mémoire et le ticket éventuels sont déjà persistés côté
      // backend (notesStore / serviceRequestsStore) — ici on met juste à
      // jour l'affichage local, sans appel réseau supplémentaire.
      if (result.memoryNote) {
        onMemoryNote?.({ id: `mem_${Date.now()}`, fr: result.memoryNote, en: result.memoryNote, ar: result.memoryNote, backendSynced: true });
      }
      if (result.ticketCreated) {
        setMessages(p => [...p, { from: "system", text: t.dir === "rtl" ? "تم إنشاء طلب لفريقنا." : "Une demande a été transmise à notre équipe." }]);
      }
      if (result.escalateToHuman && handoff === "none") {
        startHandoff();
      }
    } catch (err) {
      setTyping(false);
      const message = err instanceof ApiError ? err.message : (t.dir === "rtl" ? "تعذر الاتصال بالخادم." : "Impossible de contacter le serveur.");
      setMessages(p => [...p, { from: "system", text: message }]);
    }
  };

  const send = () => {
    if (!input.trim()) return;
    setMessages(p => [...p, { from: "user", text: input }]);
    respond(input);
    setInput("");
  };

  const startHandoff = () => {
    setHandoff("transferring");
    setMessages(p => [...p, { from: "system", text: t.transferring }]);
    pushTicket(t.talkHuman, "HIGH");
    setTimeout(() => {
      setHandoff("connected");
      setMessages(p => [...p, { from: "human", text: t.humanConnected }]);
    }, 1800);
  };

  const generateItinerary = () => setItinerary(buildItinerary(guest, lang));

  // Anciens handlers inline de ConciergeChat (modales mémoire / ville).
  const handleClearMemory = () => { onClearMemory(); setMemoryOpen(false); setMessages(p => [...p, { from: "system", text: t.dataCleared }]); };
  const handleCityBooked = (p) => { setExploreOpen(false); setMessages(m => [...m, { from: "system", text: `✓ ${p.name} — ${t.confirm}` }]); pushTicket(`${t.exploreCity} : ${p.name}`, "MED"); };

  return {
    messages, input, setInput, typing, handoff,
    memoryOpen, setMemoryOpen, exploreOpen, setExploreOpen, itinerary,
    send, startHandoff, generateItinerary, handleClearMemory, handleCityBooked,
  };
}
