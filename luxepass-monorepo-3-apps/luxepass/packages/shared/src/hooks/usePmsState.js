// @ts-check
import { useCallback, useEffect, useRef, useState } from "react";
import { pmsApi, staffApi } from "../api/apiClient";
import { getPmsState, updatePmsState } from "../api/pmsService";
import { createDefaultAppState } from "../constants";
import { useAuth } from "./useAuth";

// Doit rester identique à PMS_STATE_KEYS dans
// luxepass-backend/src/store/pmsStateStore.ts — sections de l'appState PMS
// qui sont persistées côté serveur (partagées entre tout le staff de
// l'hôtel) plutôt qu'uniquement dans le localStorage du navigateur.
export const PMS_STATE_KEYS = [
  "reservations", "yieldFactors", "invoices", "nightAuditLog", "auditLog",
  "housekeepingTasks", "crmBlacklist", "crmSegments", "teleDeclarationStatus",
  "smartLocks", "fnbStock", "waitlist", "events", "loyaltyMembers",
  "familySafety", "staffSchedule", "pmsGuests", "rooms", "services",
];

/**
 * Moteur de l'état PMS par hôtel (appelé une seule fois, par AppStateProvider).
 * Extrait tel quel de LuxePassApp — même logique, mêmes effets :
 *
 * ── Isolation & persistance des données PMS par hôtel ──
 * Chaque hôtel (base ou partenaire) possède sa propre tranche d'état
 * (clients, chambres, réservations, folios, etc.), indexée par son id.
 * `appState` / `setAppState` gardent exactement la même API qu'avant.
 *
 * @param {{ currentHotelId: string, role: string, lang: string }} args
 */
export function usePmsState({ currentHotelId, role, lang }) {
  const { staffToken, staffHotelId } = useAuth();
  const [appStateByHotel, setAppStateByHotel] = useState({});

  // ── Catalogue de services (public, tous rôles) — la source locale par
  // défaut est remplacée par le catalogue réellement édité par le staff
  // (PATCH /pms-state via ServicesManager), pour que le client voie les
  // vrais prix/disponibilités même depuis un autre appareil que celui du
  // staff.
  useEffect(() => {
    let cancelled = false;
    // ⚠️ La traduction (lang≠fr) ne doit s'appliquer qu'à l'affichage
    // client (commande spa/room service) — jamais côté staff, sinon
    // ServicesManager éditerait et réenregistrerait par-dessus une version
    // traduite du catalogue, corrompant la source de vérité en français.
    const effectiveLang = role === "client" ? lang : "fr";
    const fetchPublicServices = () => {
      pmsApi.publicServices(currentHotelId, effectiveLang)
        .then((res) => {
          if (cancelled || !res.services) return; // null = staff n'a encore rien édité, on garde le catalogue par défaut local
          setAppStateByHotel(prev => {
            const current = prev[currentHotelId] || createDefaultAppState();
            return { ...prev, [currentHotelId]: { ...current, services: res.services } };
          });
        })
        .catch(() => {});
    };
    fetchPublicServices();
    const interval = setInterval(fetchPublicServices, 15000); // 15s : pas besoin du même temps réel que les tickets
    return () => { cancelled = true; clearInterval(interval); };
  }, [currentHotelId, lang, role]);

  // ── Chargement de l'état PMS réel (backend, partagé entre tout le staff
  // de l'hôtel) dès qu'on est connecté — modules réservations/yield/
  // night-audit/CRM/conformité/locks/F&B/rôles/waitlist/événements/
  // fidélité/sécurité famille/planning staff. Route protégée côté serveur
  // (requireStaffAuth + rôle reception/gm/super_admin) : un visiteur
  // "client" garde simplement les valeurs par défaut (createDefaultAppState),
  // et le catalogue public "services" lui arrive séparément ci-dessus.
  const [remotePmsLoadedFor, setRemotePmsLoadedFor] = useState(null);
  useEffect(() => {
    if (!staffToken || !staffHotelId) return;
    if (remotePmsLoadedFor === staffHotelId) return;
    getPmsState(staffHotelId)
      .then((res) => {
        setAppStateByHotel(prev => ({
          ...prev,
          [currentHotelId]: { ...createDefaultAppState(), ...(prev[currentHotelId] || {}), ...(res.state || {}) },
        }));
        setRemotePmsLoadedFor(staffHotelId);
      })
      .catch(() => {});
  }, [staffToken, staffHotelId, currentHotelId, remotePmsLoadedFor]);

  // Déconnexion staff : l'état PMS distant devra être rechargé à la
  // prochaine connexion (avant : remis à null dans handleStaffLogout).
  const wasStaffAuthed = useRef(false);
  useEffect(() => {
    if (staffToken) { wasStaffAuthed.current = true; return; }
    if (!wasStaffAuthed.current) return;
    wasStaffAuthed.current = false;
    setRemotePmsLoadedFor(null);
  }, [staffToken]);

  const appState = appStateByHotel[currentHotelId] || createDefaultAppState();

  // Débounce l'envoi au backend pour ne pas spammer une requête PATCH à
  // chaque frappe/clic (les modules PMS appellent setAppState très souvent).
  const pmsPatchTimer = useRef(null);
  const setAppState = useCallback((updater) => {
    setAppStateByHotel(prev => {
      const current = prev[currentHotelId] || createDefaultAppState();
      const updated = typeof updater === "function" ? updater(current) : updater;

      // Synchronise vers le backend (partagé entre tout le staff) les
      // sections gérées par pmsStateStore côté serveur.
      if (staffToken && staffHotelId === currentHotelId) {
        if (pmsPatchTimer.current) clearTimeout(pmsPatchTimer.current);
        pmsPatchTimer.current = setTimeout(() => {
          const patch = {};
          PMS_STATE_KEYS.forEach((key) => {
            if (updated[key] !== undefined) patch[key] = updated[key];
          });
          if (Object.keys(patch).length > 0) {
            updatePmsState(staffHotelId, patch).catch(() => {});
          }
        }, 800);
      }

      return { ...prev, [currentHotelId]: updated };
    });
  }, [currentHotelId, staffToken, staffHotelId]);

  // Fiches police du jour (réelles) — alimente PoliceRecords sans
  // modification de ce composant (même forme que l'ancien mock).
  useEffect(() => {
    if (!staffToken || !staffHotelId) return;
    const today = new Date().toISOString().slice(0, 10);
    staffApi.policeForms(staffHotelId, today)
      .then((res) => setAppState(prev => ({ ...prev, policeForms: res.forms || [] })))
      .catch(() => {});
  }, [staffToken, staffHotelId]);

  return { appState, setAppState, setAppStateByHotel };
}
