// ─────────────────────────────────────────────────────────────
// Montants monétaires — conversion « unités principales » (ce que voit le
// client : 22 DT) ↔ « unités mineures » (ce que le PSP attend : 22000
// millimes). Module PUR (aucune dépendance) pour rester testable seul.
//
// Règle d'or : en base et vers le PSP, on ne manipule que des ENTIERS en
// unités mineures. Les flottants ne servent qu'à l'affichage / au contrat
// historique (Order.total est un Float en unités principales).
//
// ⚠️ TND = devise à TROIS décimales (1 DT = 1000 millimes). Stripe exige en
// plus que le dernier chiffre soit 0 pour les devises à 3 décimales
// (5,120 accepté, 5,123 refusé) : le montant mineur doit être un multiple
// de 10. On arrondit donc chaque PRIX UNITAIRE au multiple de 10 le plus
// proche — un total = somme de multiples de 10 reste un multiple de 10.
// ─────────────────────────────────────────────────────────────

// Devises à 0 décimale (liste Stripe).
const ZERO_DECIMAL = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga",
  "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

// Devises à 3 décimales acceptées par Stripe (dernier chiffre = 0 obligatoire).
const THREE_DECIMAL = new Set(["bhd", "jod", "kwd", "omr", "tnd"]);

export function currencyExponent(currency: string): 0 | 2 | 3 {
  const c = currency.toLowerCase();
  if (ZERO_DECIMAL.has(c)) return 0;
  if (THREE_DECIMAL.has(c)) return 3;
  return 2;
}

/** 22 (DT) → 22000 (millimes). Arrondit au multiple de 10 pour les devises à 3 décimales. */
export function toMinorUnits(amount: number, currency: string): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError(`Montant invalide: ${amount}`);
  }
  const exp = currencyExponent(currency);
  const minor = Math.round(amount * 10 ** exp);
  return exp === 3 ? Math.round(minor / 10) * 10 : minor;
}

/** 22000 (millimes) → 22 (DT). */
export function fromMinorUnits(minor: number, currency: string): number {
  return minor / 10 ** currencyExponent(currency);
}

/** Un montant mineur est-il acceptable par le PSP ? (entier > 0, multiple de 10 si 3 décimales) */
export function isValidMinorAmount(minor: number, currency: string): boolean {
  if (!Number.isSafeInteger(minor) || minor <= 0) return false;
  return currencyExponent(currency) === 3 ? minor % 10 === 0 : true;
}
