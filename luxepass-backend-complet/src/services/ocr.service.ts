import { GuestDataInput } from "../schemas";
import { config } from "../config";

// ─────────────────────────────────────────────────────────────
// ocr.service.ts — OCR réel de pièce d'identité (Passeport / CNI /
// Permis de conduire) via la vision de Gemini, à l'étape 2 du check-in
// (POST /checkin-sessions/:sessionToken/scan-id).
//
// Remplace le stub Phase 0 (résultat factice à 3 champs vides). Même
// pattern que ai.service.ts (concierge IA) : fetch natif de Node 18+
// vers l'API generativelanguage.googleapis.com, pas de dépendance SDK
// ajoutée.
//
// ─────────────────────────────────────────────────────────────
// ⚠️ Portée volontairement limitée aux champs RÉELLEMENT présents sur
// une pièce d'identité : firstName, lastName, age (calculé côté
// serveur depuis birthDate — jamais par le modèle, cf. plus bas),
// gender, idNumber, from (nationalité).
//
// `arrival`/`departure` (guestDataFieldsSchema) sont les dates du
// SÉJOUR À L'HÔTEL, pas des dates du document — `departure` pilote
// même directement le TTL du stayToken (utils/stayTokenTtl.ts, §11 du
// README). Un document d'identité n'a aucune idée des dates de séjour
// du client : les y injecter (date d'émission → arrival, date
// d'expiration → departure) casserait le formulaire de check-in avec
// des dates n'ayant aucun rapport avec la réservation. Cet OCR ne les
// renvoie donc jamais ; elles restent à la charge du staff/client à
// l'étape "Données invité" (PATCH /guest-data), comme avant.
// `destination`, `occupants`, `profession` : idem, hors du document.
// ─────────────────────────────────────────────────────────────

export class OcrServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OcrServiceError";
  }
}

export type OcrConfidence = "high" | "low";

// Champs identité extraits d'un document, jamais les champs "séjour".
type OcrExtractableFields = Pick<
  GuestDataInput,
  "firstName" | "lastName" | "age" | "gender" | "idNumber" | "from"
>;

export interface ParsedGuestData extends Partial<OcrExtractableFields> {
  // Non persisté dans guestData (guestDataFieldsSchema ne connaît pas ce
  // champ — un PATCH /guest-data qui le renverrait par erreur serait de
  // toute façon strippé par Zod). Sert uniquement au front pour inviter le
  // client/staff à relire attentivement les champs avant de confirmer.
  confidence: OcrConfidence;
  // Metadata informative pour l'UI ("Passeport détecté"...), optionnelle.
  documentType?: "passport" | "national_id" | "driving_license" | "unknown";
}

// Contrat STRICT demandé au modèle — jamais les champs "séjour" ci-dessus.
// birthDate (pas age) : on laisse le modèle lire une date, jamais lui faire
// un calcul d'âge (les LLM se trompent facilement en arithmétique de dates,
// et un âge faux impacte directement le schéma Zod côté check-in). L'âge
// est calculé ici, en TypeScript, à partir de birthDate + la date système
// réelle du serveur.
interface RawOcrModelResponse {
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null; // YYYY-MM-DD si lisible, sinon null
  gender: "M" | "F" | null; // jamais "X" ici — cf. clampGender ci-dessous
  idNumber: string | null;
  nationality: string | null;
  documentType: "passport" | "national_id" | "driving_license" | "unknown";
  confidence: "high" | "low";
}

const MAX_TOKENS = 700; // réponse = un seul petit objet JSON

// Modèle Gemini utilisé pour l'OCR — rapide et peu coûteux, suffisant
// pour une extraction de champs structurés sur un document d'identité.
// Peut être externalisé dans config.ai si besoin (config.ai.ocrModel).
const GEMINI_OCR_MODEL = "gemini-2.5-flash";

// ─────────────────────────────────────────────────────────────
// Prompt système — extraction bilingue (latin + arabe), documents
// internationaux. La translittération latine est explicitement
// demandée car le reste du système (Zod, UI fr/en) n'affiche que du
// latin ; les CNI maghrébines notamment portent souvent les deux.
// ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Tu es un système d'extraction de données pour pièces d'identité (passeport, carte nationale d'identité, permis de conduire), utilisé lors du check-in numérique d'un hôtel. Le document peut être rédigé en caractères latins, arabes, ou les deux (bilingue) — dans ce cas, utilise TOUJOURS la translittération en caractères latins si elle est présente sur le document (zone MRZ d'un passeport, ligne latine d'une CNI), car ces données alimentent un système qui n'affiche que du latin.

Analyse l'image ou le PDF fourni et extrait :
- firstName : prénom(s) tel qu'imprimé (translittéré en latin si besoin)
- lastName : nom de famille
- birthDate : date de naissance au format YYYY-MM-DD (utilise la zone MRZ d'un passeport si présente, elle est plus fiable que la zone visuelle)
- gender : "M" ou "F" tel qu'indiqué sur le document ; null si absent ou illisible — n'invente jamais
- idNumber : numéro du document (numéro de passeport, de CNI, ou de permis)
- nationality : nationalité telle qu'imprimée (ex: "Française", "Tunisienne"), ou le pays émetteur si la nationalité n'est pas explicite
- documentType : "passport", "national_id", "driving_license", ou "unknown" si tu ne peux pas déterminer le type

Règles impératives :
1. Ne complète JAMAIS un champ avec une valeur inventée ou approximative. Si un champ n'est pas lisible avec une certitude raisonnable, renvoie null pour ce champ précis.
2. Si le document est flou, partiellement masqué, coupé, mal cadré, ou d'un type que tu ne reconnais pas comme pièce d'identité : mets "confidence": "low". Sinon "confidence": "high".
3. Ne recopie jamais une valeur d'exemple ou de trame ("PASSEPORT N°...") comme si c'était une vraie donnée lue.
4. Réponds STRICTEMENT avec un unique objet JSON valide, SANS balises markdown (pas de \`\`\`json), SANS aucun texte avant ou après, respectant exactement ce schéma :
{
  "firstName": string | null,
  "lastName": string | null,
  "birthDate": string | null,
  "gender": "M" | "F" | null,
  "idNumber": string | null,
  "nationality": string | null,
  "documentType": "passport" | "national_id" | "driving_license" | "unknown",
  "confidence": "high" | "low"
}`;

// ─────────────────────────────────────────────────────────────
// Appel bas niveau à l'API Gemini (generateContent) — remplace l'ancien
// callAnthropicVision. Même contrat de sortie (une string JSON brute),
// pour ne rien changer au reste du fichier (safeParseOcrJson etc.).
// ─────────────────────────────────────────────────────────────
async function callGeminiVision(fileBuffer: Buffer, mimeType: string): Promise<string> {
  if (!config.ai.geminiApiKey) {
    throw new OcrServiceError("Clé GEMINI_API_KEY absente — OCR pièce d'identité désactivé");
  }

  const base64Data = fileBuffer.toString("base64");

  // Gemini accepte aussi bien les images que les PDF via un unique
  // content block inline_data — pas de distinction "document" vs
  // "image" à faire côté appelant, contrairement à l'API Anthropic.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_OCR_MODEL}:generateContent?key=${config.ai.geminiApiKey}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [
              { inline_data: { mime_type: mimeType, data: base64Data } },
              { text: "Analyse ce document d'identité et réponds uniquement avec le JSON demandé." },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: MAX_TOKENS,
          response_mime_type: "application/json",
        },
      }),
    });
  } catch (networkErr) {
    // Échec réseau : cas explicitement demandé — erreur remontée au
    // middleware d'erreur commun (AppError non levée ici → 500
    // "internal_error", cf. errorHandler.ts, même traitement que
    // AiServiceError pour le concierge).
    throw new OcrServiceError("Impossible de contacter l'API Gemini (réseau)");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new OcrServiceError(`Gemini API erreur ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
  if (!text) {
    throw new OcrServiceError("Réponse Gemini vide ou dans un format inattendu");
  }
  return text;
}

// ─────────────────────────────────────────────────────────────
// Nettoyage / validation de la réponse modèle.
//
// Un JSON non parsable ou aux clés manquantes N'EST PAS traité comme un
// échec API (pas de throw) : c'est exactement le cas "document flou /
// illisible" prévu par le cahier des charges → on dégrade en résultat
// confidence "low" avec des champs vides plutôt que de faire échouer le
// check-in pour un souci de formatage du modèle (le client peut toujours
// tout saisir à la main à l'étape suivante, comme avec l'ancien stub).
// ─────────────────────────────────────────────────────────────
const EMPTY_LOW_CONFIDENCE: ParsedGuestData = { confidence: "low" };

function safeParseOcrJson(raw: string): RawOcrModelResponse | null {
  const cleaned = raw.trim().replace(/^```json\s*|^```\s*|```$/g, "");
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as RawOcrModelResponse;
  } catch {
    return null;
  }
}

function cleanString(value: unknown, maxLen: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLen);
}

// Le schéma Zod (guestDataFieldsSchema) n'a pas de valeur "inconnu" pour
// gender (enum M/F/X, X = un genre à part entière, pas un fallback) : on
// n'y force donc JAMAIS de valeur quand le document ne tranche pas — on
// omet le champ (le formulaire reste vide, à remplir par le client), plutôt
// que d'assigner par défaut "X" à quelqu'un dont on n'a simplement pas pu
// lire le document.
function clampGender(value: unknown): "M" | "F" | undefined {
  return value === "M" || value === "F" ? value : undefined;
}

const BIRTH_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Âge calculé ici (jamais par le modèle) à partir de birthDate + la date
// système réelle du serveur — un LLM peut se tromper en arithmétique de
// dates ; new Date() ne se trompe jamais et ne dépend pas de la date
// d'entraînement du modèle.
function computeAge(birthDate: string, now: Date): number | undefined {
  if (!BIRTH_DATE_RE.test(birthDate)) return undefined;
  const [y, m, d] = birthDate.split("-").map(Number);
  const birth = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(birth.getTime())) return undefined;
  if (birth.getTime() > now.getTime()) return undefined; // date de naissance dans le futur : aberrant

  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const hasHadBirthdayThisYear =
    now.getUTCMonth() > birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() >= birth.getUTCDate());
  if (!hasHadBirthdayThisYear) age -= 1;

  // Bornes du schéma Zod (guestDataFieldsSchema.age: min 0, max 130).
  if (age < 0 || age > 130) return undefined;
  return age;
}

function toParsedGuestData(raw: RawOcrModelResponse, now: Date): ParsedGuestData {
  const firstName = cleanString(raw.firstName, 100);
  const lastName = cleanString(raw.lastName, 100);
  const idNumber = cleanString(raw.idNumber, 50);
  const from = cleanString(raw.nationality, 150);
  const gender = clampGender(raw.gender);
  const age = typeof raw.birthDate === "string" ? computeAge(raw.birthDate, now) : undefined;

  const validDocTypes = ["passport", "national_id", "driving_license", "unknown"] as const;
  const documentType = validDocTypes.includes(raw.documentType) ? raw.documentType : "unknown";

  // On ne fait pas confiance aveuglément à la "confidence" déclarée par le
  // modèle : si les champs jugés essentiels pour la suite du check-in
  // (identité + numéro de document) sont tous les deux absents malgré une
  // confidence "high" annoncée, on la redescend nous-mêmes à "low" — la
  // relecture humaine à l'étape suivante reste systématique de toute façon,
  // mais autant que le front sache qu'il doit insister dessus.
  const modelConfidence: OcrConfidence = raw.confidence === "high" ? "high" : "low";
  const confidence: OcrConfidence = !firstName && !lastName && !idNumber ? "low" : modelConfidence;

  return {
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
    ...(age !== undefined ? { age } : {}),
    ...(gender ? { gender } : {}),
    ...(idNumber ? { idNumber } : {}),
    ...(from ? { from } : {}),
    documentType,
    confidence,
  };
}

// ─────────────────────────────────────────────────────────────
// Fonction principale — mêmes signature/emplacement que le stub Phase 0
// (Buffer, mimetype) pour ne rien changer côté route au-delà du nom.
// ─────────────────────────────────────────────────────────────
export async function processIdDocument(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ParsedGuestData> {
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new OcrServiceError("Fichier vide reçu pour l'analyse OCR");
  }

  const raw = await callGeminiVision(fileBuffer, mimeType);
  const parsed = safeParseOcrJson(raw);
  if (!parsed) {
    // Réponse "réussie" côté API mais JSON inexploitable → dégradation
    // gracieuse, pas d'erreur (cf. commentaire au-dessus d'EMPTY_LOW_CONFIDENCE).
    return { ...EMPTY_LOW_CONFIDENCE };
  }

  return toParsedGuestData(parsed, new Date());
}

// Alias rétro-compatible : l'ancien nom du stub Phase 0. À retirer une
// fois tous les appelants migrés vers processIdDocument (un seul à ce
// jour : checkin.routes.ts, déjà migré dans ce commit).
export const extractGuestDataFromId = processIdDocument;
