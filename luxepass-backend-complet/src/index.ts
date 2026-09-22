import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import { prisma } from "./prisma";
import { authRouter } from "./routes/auth.routes";
import { checkinRouter } from "./routes/checkin.routes";
import { staffRouter } from "./routes/staff.routes";
import { ordersRouter } from "./routes/orders.routes";
import { stayRouter } from "./routes/stay.routes";
import { pmsRouter } from "./routes/pms.routes";
import { conciergeRouter } from "./routes/concierge.routes";
import { paymentsRouter, paymentsWebhookRouter } from "./routes/payments.routes";
import { errorHandler } from "./middleware/errorHandler";
import { requireStayAuth } from "./middleware/requireStayAuth";
import { NotFoundError } from "./utils/errors";

const app = express();

if (config.trustProxyHops > 0) {
  app.set("trust proxy", config.trustProxyHops);
}

app.use(helmet());

// ─────────────────────────────────────────────────────────────
// ⚠️ WEBHOOK STRIPE — DOIT rester AVANT express.json() (plus bas).
// La signature `Stripe-Signature` est calculée sur les octets EXACTS du corps :
// si express.json() le parse d'abord, le Buffer d'origine est perdu et la
// vérification échoue systématiquement (400 invalid_signature). Le router
// applique son propre express.raw({ type: "application/json" }).
// Volontairement avant cors() : appelé serveur-à-serveur (pas d'en-tête Origin)
// et jamais depuis un navigateur.
// ─────────────────────────────────────────────────────────────
app.use(paymentsWebhookRouter);

// ─────────────────────────────────────────────────────────────
// Private Network Access (Chrome récent) : quand une page servie par un
// serveur de dev (Vite sur :5173) appelle une autre origine "localhost"
// (ce backend sur :4000), le navigateur ajoute un en-tête supplémentaire
// au préflight — Access-Control-Request-Private-Network: true — et exige
// Access-Control-Allow-Private-Network: true en retour, EN PLUS des
// en-têtes CORS classiques. Le paquet `cors` ne le gère pas nativement.
//
// ⚠️ DOIT être placé AVANT app.use(cors(...)) : sur une requête OPTIONS
// de préflight, `cors` répond directement (res.end()) et n'appelle jamais
// next() — un middleware placé après lui ne s'exécute donc jamais pour
// ces requêtes-là. Posé ici, l'en-tête est déjà sur la réponse avant que
// `cors` n'ajoute les siens et ne termine la réponse.
app.use((req, res, next) => {
  if (req.headers["access-control-request-private-network"]) {
    res.setHeader("Access-Control-Allow-Private-Network", "true");
  }
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      // Pas d'en-tête Origin (curl, health checks, appels serveur-à-serveur)
      // → autorisé. Sinon, l'origine doit figurer dans CORS_ORIGIN (liste
      // séparée par des virgules, cf. config.ts / README §12).
      if (!origin) return callback(null, true);
      if (config.cors.origins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin non autorisée par CORS: ${origin}`));
    },
    credentials: true,
    // Sans cette liste, un fetch() cross-origin (Vite :5173 → API :4000) ne
    // peut PAS lire ces en-têtes (seuls les en-têtes « safelistés » sont
    // visibles). Le front en a besoin pour afficher « réessayez dans N min ».
    exposedHeaders: ["Retry-After", "RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
  })
);
app.use(express.json({ limit: "2mb" })); // signature data URL ≈ jusqu'à 2MB (cf. dataUrlSchema)
// MIGRATION SÉCURITÉ (cookie HttpOnly staff_session) : nécessaire pour lire
// req.cookies dans requireStaffAuth / POST /auth/refresh.
app.use(cookieParser());
app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "luxepass-backend", phase: "1 / SSE Livré" });
});

// ─────────────────────────────────────────────────────────────
// AJOUT (README §12, P1) : /health répond 200 même si la base refuse la
// connexion, ce qui a masqué une erreur d'authentification Postgres
// pendant la mise en route (§4.2, §14). Cette route fait une vraie
// requête pour vérifier que la base répond réellement.
// ─────────────────────────────────────────────────────────────
app.get("/health/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "up" });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[health/db] base injoignable:", err);
    res.status(503).json({ ok: false, db: "down" });
  }
});

app.use("/auth", authRouter);
app.use("/", checkinRouter); // /hotels/:hotelSlug/checkin-sessions, /checkin-sessions/:sessionToken/..., /stays/:stayId/qr-verify
app.use("/", staffRouter); // /hotels/:hotelId/pending-stays, .../pms-sync-status, .../police-forms

// ── PHASE 0 / ACTION 1 : token de séjour ──────────────────────
// Toute route /stays/:stayId/* déclarée APRÈS cette ligne (stay, orders,
// concierge, et les futures) exige soit un stayToken valide émis pour ce
// stayId (X-Stay-Token ou Authorization: Bearer), soit un JWT staff
// reception / gm / super_admin autorisé sur l'hôtel du séjour. qr-verify
// (staff, HMAC) est exempté explicitement dans requireStayAuth, pas par
// l'ordre de montage.
app.use("/stays/:stayId", requireStayAuth);

app.use("/", ordersRouter); // /stays/:stayId/orders (room service, spa — facturé sur le paiement du check-in)
// Paiement en ligne : POST /payments/create-intent (garde propre : requireStayAuthFromBody,
// car hors de /stays/:stayId) et GET /stays/:stayId/payments/:paymentId (garde ci-dessus).
app.use("/", paymentsRouter);
app.use("/", stayRouter); // /stays/:stayId/{service-requests,maintenance-reports,notes,checkout}
app.use("/", pmsRouter); // /hotels/:hotelId/{active-stays,live-feed,folios,pms-state,...} — back-office staff
app.use("/", conciergeRouter); // /stays/:stayId/concierge/messages — chatbot IA (Phase 1)

// 404 — aucune route ne correspond
app.use((req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.path}`));
});

app.use(errorHandler);

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`LuxePass backend (Phase 1 / SSE Livré) — http://localhost:${config.port}`);
  // eslint-disable-next-line no-console
  console.log(
    config.payments.stripe.enabled
      ? `Paiements : Stripe activé (mode ${config.payments.stripe.mode}, devise ${config.payments.currency})`
      : "Paiements : désactivés (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET absents) — /payments/* répondra 503"
  );
});
