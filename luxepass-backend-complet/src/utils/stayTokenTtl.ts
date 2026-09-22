// ─────────────────────────────────────────────────────────────
// Calcul de la durée de vie du token de séjour — fonction PURE (aucune
// dépendance, `now` injecté) pour être testable isolément.
//
// Règle : le token expire à la FIN du jour de départ + une marge (12 h par
// défaut). `departure` est une date seule (YYYY-MM-DD, cf. guestData.departure),
// sans heure ni fuseau : on la lit comme un jour civil UTC et on prend sa
// fin (lendemain 00:00 UTC), pas son début. Interpréter « départ + 12 h »
// depuis 00:00 couperait l'accès vers midi UTC le jour du départ — en plein
// late check-out payant, au moment où le client consulte son folio.
//
// Retourne le nombre de SECONDES restantes, ou `null` quand il n'y a pas de
// date exploitable (absente, mal formée, inexistante, ou déjà dépassée) →
// l'appelant applique alors le TTL par défaut (7 j).
// Plafond `maxSeconds` : une date de départ aberrante (2099-01-01) ne doit
// pas produire un token quasi éternel.
// ─────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const STAY_TOKEN_MAX_SECONDS = 60 * 24 * 60 * 60; // 60 jours

export function computeStayTokenTtlSeconds(
  departure: string | null | undefined,
  now: Date,
  graceHours: number,
  maxSeconds: number = STAY_TOKEN_MAX_SECONDS
): number | null {
  if (!departure) return null;
  const m = DATE_RE.exec(departure);
  if (!m) return null;

  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const startOfDay = Date.UTC(y, mo - 1, d);
  // Date.UTC « normalise » les dates impossibles (2026-02-31 → 3 mars) :
  // on refuse plutôt que d'accepter silencieusement une date fausse.
  const check = new Date(startOfDay);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    return null;
  }

  const graceMs = Math.max(0, graceHours) * 60 * 60 * 1000;
  const expiresAtMs = startOfDay + DAY_MS + graceMs;
  const ttlSeconds = Math.floor((expiresAtMs - now.getTime()) / 1000);

  if (ttlSeconds <= 0) return null;
  return Math.min(ttlSeconds, maxSeconds);
}

// ─────────────────────────────────────────────────────────────
// Plafond ABSOLU, ancré sur la création du séjour (`createdAt`), pas sur
// l'instant du renouvellement (`now`). Sans ça, un stayToken sans date de
// départ exploitable repart sur STAY_TOKEN_DEFAULT_TTL à CHAQUE appel de
// GET /pass : un token intercepté reste donc renouvelable indéfiniment tant
// que le séjour n'est pas `checked_out`. Ici, une fois `createdAt +
// absoluteMaxDays` dépassé, plus aucun renouvellement n'est possible — même
// avec une date de départ valide mais lointaine.
//
// Retourne le nombre de secondes restantes avant ce plafond absolu (peut
// être négatif ou nul : l'appelant doit alors refuser d'émettre un token).
// ─────────────────────────────────────────────────────────────
export function secondsUntilAbsoluteCap(
  createdAt: Date | string,
  now: Date,
  absoluteMaxDays: number
): number {
  const createdMs = new Date(createdAt).getTime();
  const capMs = createdMs + absoluteMaxDays * DAY_MS;
  return Math.floor((capMs - now.getTime()) / 1000);
}
