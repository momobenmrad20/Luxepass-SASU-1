// ─────────────────────────────────────────────────────────────
// pmsService.js — état PMS persisté côté backend (partagé entre tout le
// staff d'un hôtel via Postgres/Prisma), à la place de window.storage.
//
// Avant : chaque modification d'appState était écrite à la fois dans
// window.storage (local au navigateur de CHAQUE utilisateur — donc pas
// vraiment partagé) et, en parallèle, envoyée au backend via
// pmsApi.getState/patchState (voir apiClient.js). Cette double écriture
// disparaît : storagePolyfill.js est supprimé, et ces deux fonctions
// dev4iennent l'unique point d'entrée pour lire/écrire l'état PMS.
//
// pmsStateStore.patch et pmsApi.getState/patchState exposaient déjà ce
// même contrat côté backend/apiClient — ce module ne fait qu'offrir un
// point d'entrée direct, sans transiter par un token passé à la main :
// s'appuyant sur apiFetch (voir apiClient.js), la session staff est portée
// par le cookie HttpOnly staff_session, rejoué automatiquement.
// ─────────────────────────────────────────────────────────────
import { apiFetch } from "./apiClient";

// GET /hotels/:hotelId/pms-state → { state }
export async function getPmsState(hotelId) {
  return apiFetch(`/hotels/${encodeURIComponent(hotelId)}/pms-state`, {
    method: "GET",
  });
}

// PATCH /hotels/:hotelId/pms-state → { state }
// stateData : objet partiel — seules les clés fournies sont mises à jour
// côté serveur (cf. pmsStateStore.patch, un merge superficiel côté backend).
export async function updatePmsState(hotelId, stateData) {
  return apiFetch(`/hotels/${encodeURIComponent(hotelId)}/pms-state`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stateData),
  });
}
