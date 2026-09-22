import { config } from "../config";

// ─────────────────────────────────────────────────────────────
// ai.service.ts — Concierge IA (Phase 1)
//
// Remplace les réponses codées en dur de l'ancien ConciergeChat par un
// vrai appel LLM (Anthropic Messages API), fait UNIQUEMENT côté backend
// (jamais de clé API côté client — cf. commentaire déjà présent dans
// LuxePass.jsx à ce sujet).
//
// Le modèle est contraint de répondre en JSON strict (voir SYSTEM_PROMPT)
// pour qu'on puisse, à partir d'un seul appel :
//   - afficher une réponse au client dans sa langue,
//   - détecter le sentiment (pour prioriser les tickets — fonctionnalité
//     n°3 du cahier des charges),
//   - extraire une préférence à retenir en mémoire (n°1, personnalisation),
//   - créer automatiquement un ticket de service si la demande est
//     actionnable (évite au client de tout redire au staff).
//
// Aucune dépendance ajoutée : fetch natif de Node 18+, pas de SDK.
// ─────────────────────────────────────────────────────────────

export class AiServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiServiceError";
  }
}

export type ConciergeSentiment = "positive" | "neutral" | "negative" | "urgent";

export interface ConciergeGuestContext {
  firstName?: string;
  profession?: string;
  from?: string;
  arrival?: string;
  departure?: string;
  occupants?: number;
  room?: string;
  hotelName?: string;
}

export interface ConciergeAiResult {
  reply: string;
  sentiment: ConciergeSentiment;
  memoryNote: string | null;
  actionRequest: string | null;
  escalateToHuman: boolean;
}

const LANG_LABEL: Record<string, string> = {
  fr: "français",
  en: "anglais",
  ar: "arabe",
};

function buildSystemPrompt(lang: string): string {
  const langLabel = LANG_LABEL[lang] ?? "français";
  return `Tu es le concierge IA de l'hôtel LuxePass. Tu réponds toujours au client en ${langLabel}, avec un ton chaleureux, professionnel et concis (2-3 phrases maximum).

Tu reçois en contexte : le profil du client, ses préférences déjà connues, et ses tickets récents. Utilise ce contexte pour personnaliser ta réponse (ex: s'il redemande "comme d'habitude", retrouve la préférence dans le contexte fourni).

Tu dois répondre STRICTEMENT avec un objet JSON valide, sans aucun texte avant/après, sans balises markdown, respectant exactement ce schéma :
{
  "reply": string,              // ta réponse au client, dans la langue demandée
  "sentiment": "positive" | "neutral" | "negative" | "urgent",  // ton du message du client
  "memoryNote": string | null,  // si le client exprime une préférence durable (café, oreiller, allergie...) à retenir pour ses prochains séjours, résume-la en français en une phrase factuelle ; sinon null
  "actionRequest": string | null, // si le client demande concrètement un service/une action (serviette, réparation, réservation...), résume la demande en français en une phrase actionnable pour le staff ; si c'est juste une question sans action requise, null
  "escalateToHuman": boolean    // true uniquement si le sujet est sensible, litigieux, ou hors de portée d'un assistant automatique (réclamation grave, sécurité, urgence médicale)
}`;
}

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

async function callAnthropic(system: string, messages: AnthropicMessage[]): Promise<string> {
  if (!config.ai.anthropicApiKey) {
    throw new AiServiceError("Clé ANTHROPIC_API_KEY absente — concierge IA désactivé");
  }

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.ai.anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.ai.model,
        max_tokens: 500,
        system,
        messages,
      }),
    });
  } catch (networkErr) {
    throw new AiServiceError("Impossible de contacter l'API Anthropic (réseau)");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AiServiceError(`Anthropic API erreur ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.find((b) => b.type === "text")?.text;
  if (!text) {
    throw new AiServiceError("Réponse Anthropic vide ou dans un format inattendu");
  }
  return text;
}

function safeParseConciergeJson(raw: string): ConciergeAiResult {
  // Le prompt interdit les fences markdown, mais on nettoie quand même par
  // robustesse (certains modèles en ajoutent malgré la consigne).
  const cleaned = raw.trim().replace(/^```json\s*|^```\s*|```$/g, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AiServiceError("Réponse IA non parsable en JSON");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new AiServiceError("Réponse IA: JSON racine invalide");
  }
  const p = parsed as Record<string, unknown>;
  const validSentiments: ConciergeSentiment[] = ["positive", "neutral", "negative", "urgent"];
  const sentiment = validSentiments.includes(p.sentiment as ConciergeSentiment)
    ? (p.sentiment as ConciergeSentiment)
    : "neutral";
  if (typeof p.reply !== "string" || !p.reply.trim()) {
    throw new AiServiceError("Réponse IA: champ 'reply' manquant");
  }
  return {
    reply: p.reply,
    sentiment,
    memoryNote: typeof p.memoryNote === "string" && p.memoryNote.trim() ? p.memoryNote : null,
    actionRequest: typeof p.actionRequest === "string" && p.actionRequest.trim() ? p.actionRequest : null,
    escalateToHuman: p.escalateToHuman === true,
  };
}

export async function getConciergeReply(params: {
  message: string;
  lang: string;
  guest: ConciergeGuestContext;
  memoryNotes: string[]; // préférences déjà connues, les plus récentes en dernier
  recentRequests: string[]; // libellés des derniers tickets du séjour
}): Promise<ConciergeAiResult> {
  const { message, lang, guest, memoryNotes, recentRequests } = params;

  const contextLines = [
    `Client: ${guest.firstName || "inconnu"}${guest.profession ? ` (${guest.profession})` : ""}`,
    guest.from ? `Provenance: ${guest.from}` : null,
    guest.arrival && guest.departure ? `Séjour: ${guest.arrival} → ${guest.departure}` : null,
    guest.occupants ? `Occupants: ${guest.occupants}` : null,
    guest.room ? `Chambre: ${guest.room}` : null,
    guest.hotelName ? `Hôtel: ${guest.hotelName}` : null,
    memoryNotes.length ? `Préférences déjà connues: ${memoryNotes.join(" | ")}` : "Aucune préférence connue pour l'instant.",
    recentRequests.length ? `Demandes récentes: ${recentRequests.join(" | ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const userTurn = `Contexte séjour:\n${contextLines}\n\nLangue de réponse attendue: ${LANG_LABEL[lang] ?? "français"}\n\nMessage du client: "${message}"`;

  const raw = await callAnthropic(buildSystemPrompt(lang), [{ role: "user", content: userTurn }]);
  return safeParseConciergeJson(raw);
}

// ─────────────────────────────────────────────────────────────
// Traduction temps réel (fonctionnalité n°11 du cahier des charges) —
// distincte du chat: sert à traduire à la volée du contenu saisi en
// français par le staff (catalogue de services, etc.) pour l'afficher
// dans la langue du client, sans dupliquer le contenu à la main.
//
// Cache mémoire simple (clé = lang + hash du contenu source) : le
// catalogue change rarement, inutile de re-traduire à chaque requête.
// ─────────────────────────────────────────────────────────────

const translationCache = new Map<string, unknown>();

function hashKey(payload: unknown): string {
  // Pas besoin d'un vrai hash cryptographique ici — juste une clé de cache
  // stable pour un même contenu, sans dépendance ajoutée (pas de crypto).
  const s = JSON.stringify(payload);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return `${s.length}_${h}`;
}

export interface TranslatableServiceFields {
  id: string;
  name: string;
  category: string;
}

// Traduit en un seul appel (tableau complet) plutôt qu'un appel par ligne
// du catalogue — moins de latence et de coût.
export async function translateServiceCatalog(
  items: TranslatableServiceFields[],
  targetLang: "en" | "ar"
): Promise<Record<string, { name: string; category: string }>> {
  if (items.length === 0) return {};

  const cacheKey = `catalog:${targetLang}:${hashKey(items)}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return cached as Record<string, { name: string; category: string }>;

  const system = `Tu es un traducteur professionnel spécialisé dans l'hôtellerie de luxe. Tu reçois un tableau JSON d'éléments { id, name, category } en français. Traduis "name" et "category" en ${LANG_LABEL[targetLang]}, en conservant le ton haut de gamme. Réponds STRICTEMENT avec un objet JSON de la forme { "<id>": { "name": "...", "category": "..." }, ... }, sans aucun texte avant/après, sans balises markdown.`;

  const raw = await callAnthropic(system, [
    { role: "user", content: JSON.stringify(items) },
  ]);

  let parsed: Record<string, { name: string; category: string }>;
  try {
    const cleaned = raw.trim().replace(/^```json\s*|^```\s*|```$/g, "");
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AiServiceError("Réponse de traduction non parsable en JSON");
  }

  translationCache.set(cacheKey, parsed);
  return parsed;
}
