// ─────────────────────────────────────────────────────────────
// Cache en mémoire, très court (quelques secondes), pour absorber les
// pics de polling client (plusieurs onglets/appareils qui interrogent le
// même stayId ou le même catalogue de services en même temps).
//
// Ce n'est PAS un cache général de l'app : il sert uniquement à dédupliquer
// les requêtes identiques arrivant dans une fenêtre de temps très courte,
// pour que 10 requêtes simultanées ne déclenchent qu'une seule requête
// Postgres au lieu de 10. Les données restent quasi temps réel (TTL de
// quelques secondes, très inférieur à l'intervalle de polling du front).
//
// ⚠️ Ce cache est local au process. Si le backend tourne sur plusieurs
// instances (scaling horizontal), chaque instance a son propre cache —
// c'est voulu pour rester simple en Phase 1, mais si le trafic croît
// significativement, remplacer par Redis (cache partagé) plutôt que
// d'augmenter le TTL ici.
// ─────────────────────────────────────────────────────────────

interface Entry<T> {
  value: T;
  expiresAt: number;
}

interface PendingEntry<T> {
  promise: Promise<T>;
}

const cache = new Map<string, Entry<unknown>>();
const pending = new Map<string, PendingEntry<unknown>>();

/**
 * Retourne la valeur en cache si elle est encore fraîche ; sinon exécute
 * `fn`, met le résultat en cache pour `ttlMs`, et le retourne. Les appels
 * concurrents pour la même clé pendant que `fn` est en cours d'exécution
 * partagent la même promesse (pas de requêtes Postgres en double).
 */
export async function getOrSet<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }

  const inFlight = pending.get(key);
  if (inFlight) {
    return inFlight.promise as Promise<T>;
  }

  const promise = fn()
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      pending.delete(key);
      return value;
    })
    .catch((err) => {
      pending.delete(key);
      throw err;
    });

  pending.set(key, { promise });
  return promise;
}

/** Invalide une entrée précise — à appeler après toute écriture qui rend
 * une valeur en cache obsolète (ex: nouveau ticket créé pour ce stayId). */
export function invalidate(key: string): void {
  cache.delete(key);
}

/** Invalide toutes les clés commençant par ce préfixe (ex: tout un hôtel). */
export function invalidatePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
