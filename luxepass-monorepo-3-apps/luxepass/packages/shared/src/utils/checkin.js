// @ts-check
// Fonctions pures du parcours de check-in (aucune dépendance React) — extraites
// telles quelles de CheckInFlow : forfait conciergerie, détection de la marque
// de carte et normalisation des données envoyées au backend.
// Seul écart avec l'original : computeNights lit aussi les dates JJ-MM-AAAA (voir plus bas).

// ─────────────────────────────────────────────────────────────
// Forfait "Conciergerie & Bien-être" — pré-coché mais visible et décochable
// à l'écran de paiement du check-in (jamais caché, prix toujours affiché à
// côté de la case, jamais seulement sur le folio après coup).
// Tarif : 6 DT par nuitée et par occupant (voir computeConciergePrice ci-dessous).
// Extrait tel quel de LuxePass.jsx (lignes 868, 872-884 et 1576-1582
// d'origine) — n'était utilisé que par CheckInFlow, déplacé avec lui.
// ─────────────────────────────────────────────────────────────
export const CONCIERGE_PACKAGE = { id: "concierge_pkg", name: "Conciergerie & Bien-être", pricePerNightPerPerson: 6 };

// Normalise vers ce qu'attend le backend, indépendamment de la locale/du
// format saisi ou extrait par l'OCR (ex: "H" pour Homme, dates JJ-MM-AAAA
// — conventions courantes sur les CIN tunisiennes — alors que le schéma
// backend exige l'enum M/F/X et le format ISO AAAA-MM-JJ).
export const normalizeGender = (g) => {
  const v = (g || "").trim().toUpperCase();
  if (["H", "M", "HOMME", "MALE"].includes(v)) return "M";
  if (["F", "FEMME", "FEMALE"].includes(v)) return "F";
  return "X";
};
export const normalizeDate = (d) => {
  const v = (d || "").trim();
  const m = v.match(/^(\d{2})-(\d{2})-(\d{4})$/); // JJ-MM-AAAA -> AAAA-MM-JJ
  return m ? `${m[3]}-${m[2]}-${m[1]}` : v;
};

// Nombre de nuitées entre deux dates — jamais moins de 1 nuitée facturée, même
// si les dates saisies sont identiques/invalides.
// Accepte l'ISO (YYYY-MM-DD) ET le format JJ-MM-AAAA des CIN tunisiennes (que
// l'OCR pré-remplit tel quel) : sans normalisation, `new Date("21-09-2026")` est
// invalide et le forfait retombait à 1 nuit facturée, quel que soit le séjour.
export function computeNights(arrivalIso, departureIso) {
  const a = new Date(normalizeDate(arrivalIso));
  const d = new Date(normalizeDate(departureIso));
  if (isNaN(a.getTime()) || isNaN(d.getTime())) return 1;
  const diffDays = Math.round((d.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

export function computeConciergePrice(arrivalIso, departureIso, occupants) {
  const nights = computeNights(arrivalIso, departureIso);
  const pax = Math.max(1, Number(occupants) || 1);
  return { nights, pax, total: CONCIERGE_PACKAGE.pricePerNightPerPerson * nights * pax };
}

// Détection sommaire de la marque de carte à partir du BIN — purement
// indicative pour l'affichage, ne remplace pas la détection faite par le PSP.
export const detectCardBrand = (rawNumber) => {
  const n = (rawNumber || "").replace(/\s/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  return "Other";
};
