import "dotenv/config";

// ─────────────────────────────────────────────────────────────
// Config centralisée — on échoue au démarrage plutôt qu'au runtime
// si une variable critique manque (fail-fast).
// ─────────────────────────────────────────────────────────────

function required(name: string, fallbackDev?: string): string {
  const isProd = process.env.NODE_ENV === "production";

  // ⚠️ CORRECTIF SÉCURITÉ (audit) : en production, le fallback dev ne doit
  // JAMAIS servir de filet. Avant, une variable absente en prod retombait
  // silencieusement sur un secret codé en dur ("dev-only-..."), visible dans
  // le code source — un attaquant connaissant ce secret pouvait forger des
  // tokens staff valides (y compris super_admin). Le fail-fast doit se
  // déclencher sur l'ABSENCE de la variable en prod, pas seulement sur la
  // valeur placeholder de .env.example.
  const val = isProd ? process.env[name] : process.env[name] ?? fallbackDev;

  if (!val) {
    throw new Error(
      isProd
        ? `Variable d'environnement ${name} manquante en production — aucun secret par défaut n'est utilisé, refusé.`
        : `Variable d'environnement manquante: ${name}`
    );
  }
  if (isProd && val.startsWith("change-moi")) {
    throw new Error(
      `Variable d'environnement ${name} laissée à sa valeur par défaut en production — refusé.`
    );
  }
  return val;
}

// ─────────────────────────────────────────────────────────────
// Paiement en ligne (Stripe). Contrairement aux secrets JWT, l'absence de
// clés ne bloque PAS le démarrage hors production (comme ANTHROPIC_API_KEY) :
// les routes de paiement répondent alors 503 `payments_disabled` et le reste
// de l'API fonctionne. En PRODUCTION, en revanche, tout est obligatoire et
// le format est contrôlé — mieux vaut refuser de démarrer que découvrir au
// premier paiement qu'une clé publique (pk_…) a été collée à la place de la
// clé secrète, ou que le webhook ne peut pas être vérifié.
//   STRIPE_SECRET_KEY     sk_test_… / sk_live_… (ou clé restreinte rk_…)
//   STRIPE_WEBHOOK_SECRET whsec_… (secret de SIGNATURE de l'endpoint webhook,
//                         différent de la clé API)
// ─────────────────────────────────────────────────────────────
function loadPaymentsConfig() {
  const isProd = process.env.NODE_ENV === "production";
  const secretKey = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim();

  if (isProd && (!secretKey || !webhookSecret)) {
    throw new Error(
      "STRIPE_SECRET_KEY et STRIPE_WEBHOOK_SECRET sont obligatoires en production — refusé."
    );
  }
  if (secretKey && !/^(sk|rk)_(test|live)_[A-Za-z0-9]{10,}$/.test(secretKey)) {
    throw new Error(
      "STRIPE_SECRET_KEY invalide : attendu sk_test_… / sk_live_… (ou rk_…). Une clé publique pk_… n'est pas acceptée."
    );
  }
  if (webhookSecret && !/^whsec_[A-Za-z0-9+/=_-]{16,}$/.test(webhookSecret)) {
    throw new Error("STRIPE_WEBHOOK_SECRET invalide : attendu whsec_… (secret de signature de l'endpoint).");
  }

  const currency = (process.env.PAYMENT_CURRENCY ?? "tnd").trim().toLowerCase();
  if (!/^[a-z]{3}$/.test(currency)) {
    throw new Error(`PAYMENT_CURRENCY invalide: "${currency}" (code ISO 4217 attendu, ex. tnd)`);
  }

  return {
    // Devise unique de l'établissement : le montant envoyé au PSP est TOUJOURS
    // exprimé dans cette devise, jamais dans celle que le client prétend.
    currency,
    stripe: {
      secretKey,
      webhookSecret,
      enabled: Boolean(secretKey && webhookSecret),
      mode: secretKey.includes("_live_") ? ("live" as const) : ("test" as const),
    },
  };
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",

  // Utilisée par src/prisma.ts (adapter pg) — c'est bien la chaîne
  // "Transaction pooler" (DATABASE_URL, port 6543), pas DIRECT_URL qui ne
  // sert qu'aux migrations.
databaseUrl: required("DATABASE_URL"),

  supabase: {
    url: required("SUPABASE_URL"),
    anonKey: required("SUPABASE_ANON_KEY"),
    serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  },

  jwt: {

    accessSecret: required("JWT_ACCESS_SECRET", "dev-only-access-secret"),
    refreshSecret: required("JWT_REFRESH_SECRET", "dev-only-refresh-secret"),
    accessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
    refreshTtl: process.env.JWT_REFRESH_TTL ?? "7d",
  },

  checkin: {
    sessionSecret: required(
      "CHECKIN_SESSION_SECRET",
      "dev-only-checkin-secret"
    ),
    sessionTtl: process.env.CHECKIN_SESSION_TTL ?? "2h",
  },

  // Secret dédié au token de streaming SSE (live-feed). Séparé des secrets
  // staff/check-in pour qu'une fuite d'un côté ne compromette pas les
  // autres — même logique que checkin.sessionSecret. TTL volontairement
  // très court : ce token ne sert qu'à ouvrir la connexion EventSource
  // (cf. docs/tasks/REALTIME_FEED.md §2), pas à autoriser des actions REST.
  stream: {
    sessionSecret: required(
      "STREAM_SESSION_SECRET",
      "dev-only-stream-secret"
    ),
    sessionTtl: process.env.STREAM_SESSION_TTL ?? "60s",
  },

  // ─────────────────────────────────────────────────────────────
  // CORRECTIF SÉCURITÉ / QUALITÉ (README §12, P0) : secret dédié au token
  // signé porté par le QR du pass de séjour. Même logique de séparation
  // des secrets que stream.sessionSecret — voir utils/qrToken.ts.
  // ─────────────────────────────────────────────────────────────
  qrPass: {
    secret: required("QR_PASS_SECRET", "dev-only-qr-pass-secret"),
  },

  // ─────────────────────────────────────────────────────────────
  // PHASE 0 / ACTION 1 : token de séjour signé (stayToken, JWT HS256).
  // Remplace le `stayId` opaque comme seule preuve d'accès aux routes
  // /stays/:stayId/* — cf. utils/jwt.ts (signStayToken) et
  // middleware/requireStayAuth.ts.
  //   - jwtSecret  : secret DÉDIÉ (distinct de staff / check-in / stream /
  //                  QR). Fallback dev long ; en production : absent → le
  //                  démarrage échoue (required), et voir les contrôles
  //                  supplémentaires (longueur, unicité) sous l'objet config.
  //   - defaultTtl : durée de vie quand le séjour n'a pas de date de départ
  //                  exploitable.
  //   - graceHours : marge ajoutée après la fin du jour de départ, pour ne
  //                  pas couper l'accès d'un client en late check-out.
  // ─────────────────────────────────────────────────────────────
  stay: {
    jwtSecret: required(
      "STAY_JWT_SECRET",
      "dev-only-stay-jwt-secret-please-change-0123456789abcdef"
    ),
    defaultTtl: process.env.STAY_TOKEN_DEFAULT_TTL ?? "7d",
    graceHours: Number(process.env.STAY_TOKEN_GRACE_HOURS ?? 12),
    // CORRECTIF (renouvellement indéfini du pass, cf. README §12) : sans
    // `departure` exploitable, chaque appel à GET /pass repartait sur
    // STAY_TOKEN_DEFAULT_TTL (7 j) à partir de "maintenant" — un token
    // intercepté pouvait donc être renouvelé sans limite tant que le séjour
    // restait ouvert. Ce plafond est ANCRÉ sur `createdAt` du séjour (pas sur
    // "now"), donc il ne recule jamais, quel que soit le nombre de
    // renouvellements.
    absoluteMaxDays: Number(process.env.STAY_TOKEN_ABSOLUTE_MAX_DAYS ?? 30),
  },

  // ─────────────────────────────────────────────────────────────
  // CORRECTIF (README §12, P0) : CORS_ORIGIN acceptait une seule valeur,
  // impossible d'autoriser à la fois localhost et le domaine de prod.
  // Liste séparée par des virgules ; une seule valeur reste valide.
  // ─────────────────────────────────────────────────────────────
  cors: {
    origins: (process.env.CORS_ORIGIN ?? "http://localhost:3000")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
  },

  upload: {
    maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 8),
  },

  // Paiement en ligne (PaymentIntents Stripe + webhook signé) — cf.
  // services/paymentService.ts et routes/payments.routes.ts.
  payments: loadPaymentsConfig(),

  // Nombre de reverse proxies devant le backend (Nginx, Render, Fly…).
  // 0 = aucun : req.ip est l'IP du client (cas dev). > 0 : Express lit
  // X-Forwarded-For pour retrouver la vraie IP, sans quoi le rate limiting
  // compterait tous les clients comme UNE seule IP (celle du proxy).
  // ⚠️ Ne mettre > 0 que s'il y a réellement ce nombre de proxies : sinon un
  // client peut forger X-Forwarded-For et contourner les limites.
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS ?? 0),

  // Pas de `required(...)` ici : contrairement aux secrets JWT, l'absence
  // de clé IA ne doit pas empêcher le serveur de démarrer — ai.service.ts
  // gère le cas "pas de clé" en renvoyant une erreur métier (AiServiceError)
  // que concierge.routes.ts intercepte pour basculer en mode dégradé.
  ai: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
    geminiApiKey: process.env.GEMINI_API_KEY ?? "",
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
    // OCR pièce d'identité (ocr.service.ts) : modèle séparément
    // configurable (utile si on veut un jour basculer sur un modèle
    // différent pour la vision vs. le concierge texte), replié sur le
    // même modèle par défaut.
    ocrModel: process.env.ANTHROPIC_OCR_MODEL ?? process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
  },
} as const;

// ─────────────────────────────────────────────────────────────
// Contrôles de production sur STAY_JWT_SECRET (en plus de required()) :
//  - longueur minimale : un secret HS256 court se casse par force brute ;
//  - unicité : la séparation des familles de tokens (staff / check-in /
//    stream / QR / séjour) n'a de sens que si les secrets sont distincts —
//    sinon une fuite d'un côté permettrait de forger l'autre.
// ─────────────────────────────────────────────────────────────
if (config.nodeEnv === "production") {
  const staySecret = config.stay.jwtSecret;
  if (staySecret.length < 32) {
    throw new Error(
      "STAY_JWT_SECRET trop court en production (32 caractères minimum) — refusé."
    );
  }
  const others = [
    config.jwt.accessSecret,
    config.jwt.refreshSecret,
    config.checkin.sessionSecret,
    config.stream.sessionSecret,
    config.qrPass.secret,
  ];
  if (others.includes(staySecret)) {
    throw new Error(
      "STAY_JWT_SECRET doit être distinct des autres secrets (JWT staff, check-in, stream, QR) — refusé."
    );
  }
}

if (config.nodeEnv === "production" && config.payments.stripe.enabled && config.payments.stripe.mode === "test") {
  // eslint-disable-next-line no-console
  console.warn("[payments] ⚠️ NODE_ENV=production mais STRIPE_SECRET_KEY est une clé de TEST — aucun vrai paiement ne sera encaissé.");
}

