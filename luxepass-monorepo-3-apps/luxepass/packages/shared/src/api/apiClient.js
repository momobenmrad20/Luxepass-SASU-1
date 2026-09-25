// ─────────────────────────────────────────────────────────────
// apiClient.js — Client HTTP LuxePass (backend réel Express/TypeScript/
// PostgreSQL — luxepass-backend, port 4000 par défaut, pas de préfixe
// /api/v1, checkin identifié par :sessionToken dans l'URL).
//
// Contenu :
//   1. Session staff : MIGRATION SÉCURITÉ — le JWT de session ne transite
//      plus par le JSON/localStorage (vulnérable au XSS) mais par un
//      cookie HttpOnly posé par le backend (staff_session / staff_refresh,
//      cf. luxepass-backend/src/utils/cookies.ts). Ce fichier n'y touche
//      plus du tout : le navigateur le gère seul, on se contente d'envoyer
//      `credentials: 'include'` sur chaque requête pour qu'il soit rejoué.
//   2. apiFetch() : wrapper fetch — cookies inclus, refresh automatique
//      sur 401, une seule tentative de refresh en vol.
//   3. Les namespaces d'API métier (checkin, orders, stay, staff, pms,
//      concierge) — signatures inchangées par rapport à la version
//      précédente pour ne rien casser côté LuxePass.jsx.
//   4. connectLiveFeed() : flux temps réel SSE du live-feed staff, avec
//      reconnexion pilotée manuellement (le stream_token expire en 60s,
//      cf. commentaire dédié plus bas).
// ─────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

// ── 1. Nettoyage ponctuel de l'ANCIEN stockage (localStorage) ──
// Purge, une fois au chargement du module, les jetons staff laissés par une
// session antérieure à la migration cookie HttpOnly — pour ne pas les
// laisser traîner indéfiniment, lisibles par tout script, dans le
// localStorage d'un navigateur déjà utilisé avec l'ancienne version.
const LEGACY_ACCESS_TOKEN_KEY = "luxepass_access_token";
const LEGACY_REFRESH_TOKEN_KEY = "luxepass_refresh_token";
(function purgeLegacyStaffTokens() {
  try {
    localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  } catch {
    // localStorage indisponible (navigation privée stricte, etc.) — rien à purger
  }
})();

// ── 1bis. Séjour client + token de séjour (localStorage) ────
// Persistance du séjour en cours côté client (P1 §2.1), en DEUX clés :
//  - `luxepass_client_stay` : { stayId, qrToken, hotelId } — de quoi rappeler
//    GET /stays/:stayId/pass au rechargement et resélectionner l'hôtel ;
//  - `luxepass_stay_token`  : le `stayToken` seul (chaîne JWT brute), émis à
//    l'étape 6 du check-in et renouvelé par /pass (PHASE 0 / ACTION 1).
// C'est le stayToken — et non plus le stayId seul — qui ouvre les routes
// /stays/:stayId/* : stayFetch l'envoie en `Authorization: Bearer`. Il ne doit
// JAMAIS aller dans le QR (présenté au staff) ni dans un état partagé avec le
// PMS (pmsGuests, policeForms, PMS_STATE_KEYS).
const CLIENT_STAY_KEY = "luxepass_client_stay";
const STAY_TOKEN_KEY = "luxepass_stay_token";

// Événement window émis quand le token de séjour est absent, expiré ou
// refusé (401/403) : le séjour local est alors inutilisable et a déjà été
// effacé. `event.detail` = { status, code, message }. LuxePassApp l'écoute pour
// ramener le client à l'écran de check-in avec un message.
export const STAY_AUTH_LOST_EVENT = "luxepass:stay-auth-lost";
export const STAY_SESSION_MESSAGE = "Session de séjour expirée ou invalide";

// Copie en mémoire du séjour courant : si localStorage est inaccessible
// (navigation privée stricte), le token reste utilisable pour la session en
// cours (le client perdra seulement la restauration après rechargement).
let memoryStay = null;

function lsGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* pas de repli possible : le client perdra la restauration au reload */ }
}
function lsRemove(key) {
  try { localStorage.removeItem(key); } catch { /* rien à nettoyer si localStorage est inaccessible */ }
}

// Lecture (NON vérifiée) du payload d'un JWT. La signature ne peut pas être
// contrôlée dans le navigateur (le secret reste côté serveur) : cette lecture
// sert uniquement à vérifier que le token stocké est bien CELUI de ce séjour
// avant de l'envoyer. Le serveur reste le seul juge de sa validité.
function decodeJwtClaims(token) {
  try {
    const part = String(token).split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function stayTokenMatches(token, stayId) {
  const claims = decodeJwtClaims(token);
  return !!claims && claims.type === "stay_pass" && claims.stayId === stayId;
}

// Retourne { stayId, qrToken, hotelId, stayToken? } ou null. Le stayToken n'est
// renvoyé que s'il est bien un token de séjour émis pour CE stayId : un token
// périmé d'un ancien séjour (autre onglet, clé orpheline) est ignoré.
/** @returns {{ stayId: string, qrToken: string, hotelId: string, stayToken?: string | null }|null} */
export function getClientStay() {
  let entry = null;
  let legacyToken = null;
  const raw = lsGet(CLIENT_STAY_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.stayId) {
        entry = { stayId: parsed.stayId, qrToken: parsed.qrToken, hotelId: parsed.hotelId };
        legacyToken = parsed.stayToken || null; // ancien format (token dans l'entrée)
      }
    } catch { /* entrée corrompue : on retombe sur la copie mémoire */ }
  }
  if (!entry && memoryStay) {
    entry = { stayId: memoryStay.stayId, qrToken: memoryStay.qrToken, hotelId: memoryStay.hotelId };
  }
  if (!entry) return null;

  const candidates = [
    lsGet(STAY_TOKEN_KEY),
    memoryStay?.stayId === entry.stayId ? memoryStay.stayToken : null,
    legacyToken,
  ];
  const stayToken = candidates.find((tok) => tok && stayTokenMatches(tok, entry.stayId));
  return stayToken ? { ...entry, stayToken } : entry;
}

// `stayToken` omis = on conserve celui déjà stocké pour CE stayId (la
// restauration au rechargement réécrit l'entrée avec un qrToken frais sans
// toujours disposer d'un nouveau token : il ne doit pas être perdu au passage).
export function setClientStay({ stayId, qrToken, hotelId, stayToken }) {
  const previous = getClientStay();
  const keptToken = stayToken ?? (previous?.stayId === stayId ? previous?.stayToken : undefined);
  memoryStay = { stayId, qrToken, hotelId, ...(keptToken ? { stayToken: keptToken } : {}) };
  lsSet(CLIENT_STAY_KEY, JSON.stringify({ stayId, qrToken, hotelId }));
  if (keptToken) lsSet(STAY_TOKEN_KEY, keptToken);
  else lsRemove(STAY_TOKEN_KEY); // nouveau séjour sans token : pas de token orphelin
}

export function clearClientStay() {
  memoryStay = null;
  lsRemove(CLIENT_STAY_KEY);
  lsRemove(STAY_TOKEN_KEY);
}

function getStayToken(stayId) {
  const stay = getClientStay();
  return stay?.stayId === stayId ? stay.stayToken || null : null;
}

export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;       // ex: "not_found", "conflict", "validation_error", "session_expired"
    this.details = details; // tableau d'issues Zod [{ source, message, path, ... }, ...] sur les 400
  }
}

// Format d'erreur du backend (errorHandler.ts), stable sur toutes les routes :
//   { error: "<code>", message: "<texte prêt à afficher>", details?: [...] }
async function handleResponse(res) {
  let body = null;
  try { body = await res.json(); } catch { /* réponse vide/non-JSON (ex: 204) */ }

  if (!res.ok) {
    const message = body?.message || `Erreur serveur (${res.status})`;
    throw new ApiError(message, { status: res.status, code: body?.error, details: body?.details });
  }
  return body;
}

// ── 2. apiFetch : cookies inclus + refresh auto sur 401 ─────

// Une seule requête POST /auth/refresh en vol à la fois : les appels
// concurrents qui essuient un 401 en même temps attendent la même
// promesse plutôt que de déclencher plusieurs refresh en parallèle
// (ce qui invaliderait les tokens les uns les autres côté serveur).
let refreshInFlight = null;

async function refreshAccessToken() {
  if (!refreshInFlight) {
    // Le refresh token voyage dans le cookie HttpOnly staff_refresh
    // (`credentials: 'include'`) — plus besoin de le lire/l'envoyer nous-mêmes.
    // Le backend repose un cookie staff_session frais ; rien à stocker ici.
    refreshInFlight = fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    })
      .then(handleResponse)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

// options._isRetry : usage interne uniquement (une seule tentative de
// replay après refresh, jamais de boucle).
export async function apiFetch(path, options = {}, _isRetry = false) {
  const isAuthEndpoint = path.startsWith("/auth/login") || path.startsWith("/auth/refresh");

  // MIGRATION SÉCURITÉ (localStorage → cookie HttpOnly) : plus d'injection
  // manuelle d'un header `Authorization: Bearer` lu en localStorage — le
  // cookie `staff_session` HttpOnly posé par le backend est rejoué
  // automatiquement par le navigateur dès lors que `credentials: 'include'`
  // est passé. staffApi/pmsApi n'ont donc plus besoin de porter le moindre
  // token : c'est cette seule option qui fournit l'authentification staff
  // courante à chaque requête.
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, credentials: "include" });
  } catch (networkErr) {
    // Erreur réseau (backend éteint, mauvais port, CORS bloqué) — pas de
    // réponse HTTP du tout, donc pas de body à lire.
    throw new ApiError("Impossible de contacter le serveur. Vérifiez votre connexion.", { status: 0 });
  }

  if (res.status === 401 && !_isRetry && !isAuthEndpoint) {
    try {
      await refreshAccessToken();
      // Le cookie staff_session a été renouvelé côté navigateur : il suffit
      // de rejouer la même requête, `credentials: 'include'` s'occupe du reste.
      return apiFetch(path, options, true);
    } catch {
      // Refresh échoué (cookie refresh absent/expiré/révoqué) : on laisse
      // handleResponse() ci-dessous lever le 401 d'origine.
    }
  }

  return handleResponse(res);
}

// ── 2bis. stayFetch : appels /stays/:stayId/* avec le token de séjour ──
// Volontairement SÉPARÉ d'apiFetch :
//  - apiFetch envoie la session STAFF via le cookie HttpOnly staff_session
//    (`credentials: 'include'`) ; ici on impose toujours le stayToken en
//    `Authorization: Bearer` (un navigateur peut porter à la fois une
//    session staff et un séjour client — cas de la démo) ;
//  - sur 401, apiFetch tente un refresh STAFF puis rejoue avec le cookie
//    staff renouvelé : absurde pour un stayToken, qui n'a pas de refresh (il
//    vit jusqu'à la fin du séjour). Un token absent/expiré/refusé = séjour
//    perdu, pas à rafraîchir.
const STAY_TOKEN_ERROR_CODES = new Set([
  "stay_token_missing",
  "stay_token_invalid",
  "stay_token_expired",
]);

// Token valide mais émis pour un AUTRE séjour : 403 "forbidden". Sous
// /stays/:stayId/* le garde requireStayAuth est la seule source de 403, donc
// tout 403 y signifie « ce token n'ouvre pas ce séjour ».
function isStayAuthError(err) {
  if (!(err instanceof ApiError)) return false;
  return STAY_TOKEN_ERROR_CODES.has(err.code) || (err.status === 403 && err.code === "forbidden");
}

function signalStayAuthLost({ clear = true, status = 401, code = "stay_token_missing" } = {}) {
  if (clear) clearClientStay();
  try {
    window.dispatchEvent(
      new CustomEvent(STAY_AUTH_LOST_EVENT, { detail: { status, code, message: STAY_SESSION_MESSAGE } })
    );
  } catch {
    // environnement sans window/CustomEvent : l'erreur levée suffit
  }
}

async function stayFetch(stayId, path, options = {}) {
  const stayToken = getStayToken(stayId);
  if (!stayToken) {
    // Inutile d'interroger le serveur : la réponse serait un 401 certain
    // (ex. séjour créé avant l'ACTION 1, resté dans localStorage sans token).
    // Si la clé locale appartient à un AUTRE séjour (autre onglet ayant refait
    // un check-in), on ne l'efface pas : elle n'est pas celle qui a échoué.
    const stored = getClientStay();
    signalStayAuthLost({ clear: !stored || stored.stayId === stayId });
    throw new ApiError(STAY_SESSION_MESSAGE, { status: 401, code: "stay_token_missing" });
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${stayToken}`);

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError("Impossible de contacter le serveur. Vérifiez votre connexion.", { status: 0 });
  }

  try {
    return await handleResponse(res);
  } catch (err) {
    if (isStayAuthError(err)) {
      // 401/403 sur le jeton de séjour : séjour effacé, événement émis, et un
      // message uniforme (le texte serveur varie selon la cause).
      signalStayAuthLost({ status: err.status, code: err.code });
      throw new ApiError(STAY_SESSION_MESSAGE, { status: err.status, code: err.code });
    }
    throw err;
  }
}

// ── 3. API métier ────────────────────────────────────────────

export const checkinApi = {
  // POST /hotels/:hotelSlug/checkin-sessions → { sessionToken, stage: "started" }
  async start(hotelSlug) {
    return apiFetch(`/hotels/${encodeURIComponent(hotelSlug)}/checkin-sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  },

  // POST /checkin-sessions/:sessionToken/scan-id (multipart, champ "idDocument")
  // → { stage: "scanned", extracted }
  async scanId(sessionToken, file) {
    const formData = new FormData();
    formData.append("idDocument", file);
    return apiFetch(`/checkin-sessions/${encodeURIComponent(sessionToken)}/scan-id`, {
      method: "POST",
      body: formData, // ne PAS fixer Content-Type — le navigateur ajoute la boundary multipart
    });
  },

  // PATCH /checkin-sessions/:sessionToken/guest-data → { stage: "guest_data", guestData }
  async patchGuestData(sessionToken, guestData) {
    return apiFetch(`/checkin-sessions/${encodeURIComponent(sessionToken)}/guest-data`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(guestData),
    });
  },

  // PATCH /checkin-sessions/:sessionToken/children → { children }
  async patchChildren(sessionToken, children) {
    return apiFetch(`/checkin-sessions/${encodeURIComponent(sessionToken)}/children`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(children),
    });
  },

  // POST /checkin-sessions/:sessionToken/signature → { stage: "signed" }
  async postSignature(sessionToken, signatureDataUrl) {
    return apiFetch(`/checkin-sessions/${encodeURIComponent(sessionToken)}/signature`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signatureDataUrl }),
    });
  },

  // POST /checkin-sessions/:sessionToken/payment-method → { stage: "paid" }
  async postPaymentMethod(sessionToken, { pspToken, last4, brand }) {
    return apiFetch(`/checkin-sessions/${encodeURIComponent(sessionToken)}/payment-method`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pspToken, last4, brand }),
    });
  },

  // POST /checkin-sessions/:sessionToken/complete → { stage, stayId, room, qrToken, stayToken }
  async complete(sessionToken, room) {
    return apiFetch(`/checkin-sessions/${encodeURIComponent(sessionToken)}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room }),
    });
  },

  // GET /stays/:stayId/qr-verify?token=... → { valid, guestName?, room? }
  async verifyStayQr(stayId, token) {
    return apiFetch(`/stays/${encodeURIComponent(stayId)}/qr-verify?token=${encodeURIComponent(token)}`, {
      method: "GET",
    });
  },
};

export const ordersApi = {
  // POST /stays/:stayId/orders → { orderId, status, total }
  async create(stayId, items, category = "room_service") {
    return stayFetch(stayId, `/stays/${encodeURIComponent(stayId)}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, items }),
    });
  },

  // GET /stays/:stayId/orders → { orders, folioTotal }
  async list(stayId) {
    return stayFetch(stayId, `/stays/${encodeURIComponent(stayId)}/orders`, { method: "GET" });
  },
};

export const paymentsApi = {
  // POST /payments/create-intent → { paymentId, clientSecret, total, currency }
  // Hors de /stays/:stayId (stayId dans le corps, cf. requireStayAuthFromBody
  // côté backend) — on réutilise quand même stayFetch : il ne fait que
  // chercher le stayToken pour ce stayId et l'injecter en Authorization,
  // peu importe le chemin appelé.
  // `items` ne porte JAMAIS de prix : {id, qty} uniquement — le total réel
  // est recalculé côté serveur depuis le catalogue (`amount` n'est qu'un
  // contrôle de cohérence, 409 price_mismatch en cas d'écart).
  async createIntent(stayId, { category, items, amount, currency }, idempotencyKey) {
    const headers = { "Content-Type": "application/json" };
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    return stayFetch(stayId, `/payments/create-intent`, {
      method: "POST",
      headers,
      body: JSON.stringify({ stayId, category, items, amount, currency }),
    });
  },

  // GET /stays/:stayId/payments/:paymentId → { paymentId, status, total, currency, orderId }
  // Le webhook Stripe est asynchrone : après stripe.confirmPayment() côté
  // navigateur, on interroge cette route jusqu'à status "PAID"/"FAILED" —
  // le retour de confirmPayment ne prouve jamais l'encaissement à lui seul.
  async getStatus(stayId, paymentId) {
    return stayFetch(
      stayId,
      `/stays/${encodeURIComponent(stayId)}/payments/${encodeURIComponent(paymentId)}`,
      { method: "GET" }
    );
  },
};

export const staffAuthApi = {
  // POST /auth/login → { staff }
  // MIGRATION SÉCURITÉ : le backend ne renvoie plus les jetons dans le
  // JSON — il les pose en cookies HttpOnly (staff_session / staff_refresh).
  // Rien à stocker ici : `credentials: 'include'` (dans apiFetch) suffit à
  // les faire rejouer par le navigateur sur les appels suivants.
  async login(email, password) {
    return apiFetch(`/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  },

  // GET /auth/me → { staff: { id, email, role, hotelId } }
  // Restaure la session staff après un rechargement de page. Le cookie
  // staff_session est rejoué automatiquement ; s'il est périmé, apiFetch
  // tente un refresh (cookie staff_refresh) puis rejoue l'appel.
  async me() {
    return apiFetch(`/auth/me`, { method: "GET" });
  },

  // POST /auth/logout — efface les cookies staff_session / staff_refresh
  // côté serveur (un cookie HttpOnly n'est pas effaçable depuis ce fichier :
  // il faut un Set-Cookie d'expiration renvoyé par le backend). L'appelant
  // doit aussi remettre son état React à null (voir handleStaffLogout dans
  // LuxePass.jsx), ce qu'on fait même si l'appel réseau échoue.
  async logout() {
    try {
      await apiFetch(`/auth/logout`, { method: "POST" });
    } catch {
      // Backend injoignable : les cookies resteront jusqu'à leur expiration
      // naturelle, mais l'état local est de toute façon remis à zéro par
      // l'appelant.
    }
  },
};

// CORRECTIF (README §6/§12) : staffApi/pmsApi ne prennent plus de `token`
// en premier argument. `apiFetch` envoie déjà la session staff courante via
// le cookie HttpOnly staff_session (`credentials: 'include'`, §2) — c'est le
// même mécanisme qu'utilisent checkinApi, ordersApi, staffAuthApi.me() et
// pmsService.js. Passer un token à la main n'aurait plus de sens : le
// navigateur gère seul ce cookie, invisible et inaccessible en JS.
export const staffApi = {
  async pendingStays(hotelId) {
    return apiFetch(`/hotels/${encodeURIComponent(hotelId)}/pending-stays`, { method: "GET" });
  },
  async markPmsSynced(hotelId, stayId) {
    return apiFetch(`/hotels/${encodeURIComponent(hotelId)}/stays/${encodeURIComponent(stayId)}/pms-sync-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ synced: true }),
    });
  },
  // POST /hotels/:hotelId/stays/:stayId/checkout → { stayId, status }
  // Check-out digital déclenché par la réception. Remplace l'ancien appel à
  // POST /stays/:stayId/checkout, qui exige désormais le stayToken du client.
  async checkoutStay(hotelId, stayId) {
    return apiFetch(`/hotels/${encodeURIComponent(hotelId)}/stays/${encodeURIComponent(stayId)}/checkout`, {
      method: "POST",
    });
  },
  // PATCH /hotels/:hotelId/stays/:stayId/room → { stayId, room }
  // Assigne/corrige la chambre d'un séjour digital réel, pour la reprise
  // manuelle PMS (ManualCheckInOut.jsx → useStaffActions.assignStayRoom).
  async assignRoom(hotelId, stayId, room) {
    return apiFetch(`/hotels/${encodeURIComponent(hotelId)}/stays/${encodeURIComponent(stayId)}/room`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room }),
    });
  },
  async policeForms(hotelId, date) {
    return apiFetch(`/hotels/${encodeURIComponent(hotelId)}/police-forms?date=${encodeURIComponent(date)}`, {
      method: "GET",
    });
  },
  async listStaff(hotelId) {
    return apiFetch(`/hotels/${encodeURIComponent(hotelId)}/staff`, { method: "GET" });
  },
  async createStaff(hotelId, { email, password, role, name }) {
    return apiFetch(`/hotels/${encodeURIComponent(hotelId)}/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role, name }),
    });
  },
  async deleteStaff(hotelId, staffId) {
    return apiFetch(`/hotels/${encodeURIComponent(hotelId)}/staff/${encodeURIComponent(staffId)}`, {
      method: "DELETE",
    });
  },
};

export const pmsApi = {
  async activeStays(hotelId) {
    return apiFetch(`/hotels/${encodeURIComponent(hotelId)}/active-stays`, { method: "GET" });
  },
  async liveFeed(hotelId) {
    return apiFetch(`/hotels/${encodeURIComponent(hotelId)}/live-feed`, { method: "GET" });
  },
  async resolveTicket(hotelId, requestId, status = "done") {
    return apiFetch(`/hotels/${encodeURIComponent(hotelId)}/service-requests/${encodeURIComponent(requestId)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  },
  async resolveMaintenance(hotelId, reportId, status = "done") {
    return apiFetch(`/hotels/${encodeURIComponent(hotelId)}/maintenance-reports/${encodeURIComponent(reportId)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  },
  async advanceOrderStatus(hotelId, orderId, status) {
    return apiFetch(`/hotels/${encodeURIComponent(hotelId)}/orders/${encodeURIComponent(orderId)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  },
  async folios(hotelId) {
    return apiFetch(`/hotels/${encodeURIComponent(hotelId)}/folios`, { method: "GET" });
  },
  async getState(hotelId) {
    return apiFetch(`/hotels/${encodeURIComponent(hotelId)}/pms-state`, { method: "GET" });
  },
  async patchState(hotelId, patch) {
    return apiFetch(`/hotels/${encodeURIComponent(hotelId)}/pms-state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  },
  // Catalogue de services (public, pas de token)
  async publicServices(hotelSlug, lang = "fr") {
    return apiFetch(`/hotels/${encodeURIComponent(hotelSlug)}/services?lang=${encodeURIComponent(lang)}`, { method: "GET" });
  },
};

export const stayApi = {
  async requestService(stayId, req, priority = "MED", price = 0) {
    return stayFetch(stayId, `/stays/${encodeURIComponent(stayId)}/service-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ req, priority, price }),
    });
  },
  async listServiceRequests(stayId) {
    return stayFetch(stayId, `/stays/${encodeURIComponent(stayId)}/service-requests`, { method: "GET" });
  },
  async reportMaintenance(stayId, issue, equipment) {
    return stayFetch(stayId, `/stays/${encodeURIComponent(stayId)}/maintenance-reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issue, equipment }),
    });
  },
  async listMaintenanceReports(stayId) {
    return stayFetch(stayId, `/stays/${encodeURIComponent(stayId)}/maintenance-reports`, { method: "GET" });
  },
  async addNote(stayId, text) {
    return stayFetch(stayId, `/stays/${encodeURIComponent(stayId)}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  },
  async listNotes(stayId) {
    return stayFetch(stayId, `/stays/${encodeURIComponent(stayId)}/notes`, { method: "GET" });
  },
  async clearNotes(stayId) {
    return stayFetch(stayId, `/stays/${encodeURIComponent(stayId)}/notes`, { method: "DELETE" });
  },
  async checkout(stayId) {
    return stayFetch(stayId, `/stays/${encodeURIComponent(stayId)}/checkout`, { method: "POST" });
  },
  // GET /stays/:stayId/pass → { stayId, room, guestName, status, qrToken, stayToken }
  // `stayToken` est un token frais (renouvellement à chaque restauration), ou
  // null si le séjour est `checked_out`.
  async getPass(stayId) {
    return stayFetch(stayId, `/stays/${encodeURIComponent(stayId)}/pass`, { method: "GET" });
  },
};

export const conciergeApi = {
  // POST /stays/:stayId/concierge/messages → { reply, sentiment, ticketCreated, escalateToHuman, degraded }
  async sendMessage(stayId, message, lang = "fr") {
    return stayFetch(stayId, `/stays/${encodeURIComponent(stayId)}/concierge/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, lang }),
    });
  },
};

// ── 4. connectLiveFeed — flux temps réel SSE (live-feed staff) ─────
//
// Remplace le polling (setInterval + pmsApi.liveFeed) : ouvre un flux
// Server-Sent Events sur GET /hotels/:hotelId/live-feed/stream.
//
// Étape 1 : POST /hotels/:hotelId/live-feed/stream-token → { streamToken }
//           (la session staff est requise ici — portée automatiquement par
//           apiFetch via le cookie HttpOnly staff_session, cf. §2).
// Étape 2 : new EventSource(".../live-feed/stream?stream_token=...").
// Étape 3 : écoute "snapshot" (état complet initial) puis les événements
//           métier un par un (mêmes types que hotelEventBus côté serveur).
// Étape 4 : sur erreur, on ferme nous-mêmes la connexion et on attend 3s
//           avant de relancer l'étape 1 pour obtenir un stream_token
//           FRAIS. Nécessaire car ce token expire en 60s (TTL serveur) —
//           il ne sert qu'à ouvrir la connexion, pas à la maintenir. La
//           reconnexion native d'EventSource réutiliserait la même URL
//           avec un stream_token déjà expiré et boucler en 401 ; on la
//           désactive donc en fermant la connexion avant qu'elle ne s'en
//           charge elle-même.
const LIVE_FEED_EVENT_TYPES = [
  "service_request.created",
  "service_request.updated",
  "maintenance.created",
  "maintenance.updated",
  "order.created",
  "order.updated",
  "note.added",
  "stay.completed",
  "stay.checked_out",
];

const LIVE_FEED_RECONNECT_DELAY_MS = 3000;

// connectLiveFeed(hotelId, { onSnapshot, onItemUpdate, onError }) → disconnect()
//   onSnapshot(snapshot)                 — reçu à la connexion (et à chaque reconnexion)
//   onItemUpdate(eventType, data)        — un des LIVE_FEED_EVENT_TYPES ci-dessus
//   onError(err)                         — appelé à chaque erreur (avant reconnexion) ;
//                                           utile pour un indicateur "reconnexion..." en UI
// La fonction retournée ferme définitivement le flux (à appeler dans le
// cleanup du useEffect qui a ouvert la connexion).
export function connectLiveFeed(hotelId, { onSnapshot, onItemUpdate, onError } = {}) {
  let es = null;
  let reconnectTimer = null;
  let stopped = false;

  function scheduleReconnect() {
    if (stopped || reconnectTimer) return;
    if (es) {
      es.close();
      es = null;
    }
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      open();
    }, LIVE_FEED_RECONNECT_DELAY_MS);
  }

  async function open() {
    if (stopped) return;
    try {
      // Étape 1 : nouveau stream_token (token staff injecté auto par apiFetch)
      const { streamToken } = await apiFetch(
        `/hotels/${encodeURIComponent(hotelId)}/live-feed/stream-token`,
        { method: "POST" }
      );
      if (stopped) return;

      // Étape 2 : ouverture du flux SSE
      es = new EventSource(
        `${API_BASE}/hotels/${encodeURIComponent(hotelId)}/live-feed/stream?stream_token=${encodeURIComponent(streamToken)}`
      );

      // Étape 3 : snapshot initial + événements métier
      es.addEventListener("snapshot", (e) => {
        onSnapshot?.(JSON.parse(e.data));
      });
      LIVE_FEED_EVENT_TYPES.forEach((type) => {
        es.addEventListener(type, (e) => {
          onItemUpdate?.(type, JSON.parse(e.data));
        });
      });

      // Étape 4 : sur erreur (connexion perdue, stream_token expiré en
      // cours de route, backend redémarré...), on reprend depuis l'étape 1.
      es.onerror = (err) => {
        onError?.(err);
        scheduleReconnect();
      };
    } catch (err) {
      onError?.(err);
      scheduleReconnect();
    }
  }

  open();

  return function disconnect() {
    stopped = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (es) es.close();
  };
}
