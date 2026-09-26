import type { GuestDataInput } from "../schemas";

// ─────────────────────────────────────────────────────────────
// Sépare le payload GuestDataInput (schemas.ts, patchGuestDataSchema) en :
//  - operational : reste dans checkin_sessions.guestData en clair
//    (nécessaire à folios.guestName et à checkinStore.listByArrivalDate,
//    qui filtrent respectivement sur firstName/lastName et sur "arrival")
//  - sensitive   : migre vers identity_documents, chiffré (idem champs
//    affichés dans la fiche PMS : n° pièce, âge, sexe, profession,
//    provenance, destination)
// ─────────────────────────────────────────────────────────────

export interface OperationalGuestData {
  firstName: string;
  lastName: string;
  arrival: string;
  departure: string;
  occupants: number;
}

export interface SensitiveGuestData {
  age: number;
  gender: "M" | "F" | "X";
  idNumber: string;
  profession: string;
  from: string;
  destination: string;
}

export function splitGuestData(input: GuestDataInput): {
  operational: OperationalGuestData;
  sensitive: SensitiveGuestData;
} {
  const { firstName, lastName, arrival, departure, occupants, age, gender, idNumber, profession, from, destination } =
    input;

  return {
    operational: { firstName, lastName, arrival, departure, occupants },
    sensitive: { age, gender, idNumber, profession, from, destination },
  };
}

// Recombine pour l'affichage staff (PMS) une fois les deux parties lues :
// operational depuis checkinStore, sensitive déchiffré depuis
// identityDocumentStore.getDecrypted(...).sensitiveGuestData.
export function mergeGuestDataForDisplay(
  operational: Partial<OperationalGuestData> | null | undefined,
  sensitive: Partial<SensitiveGuestData> | null | undefined
): Record<string, unknown> {
  return { ...(operational ?? {}), ...(sensitive ?? {}) };
}
