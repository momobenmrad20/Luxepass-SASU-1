# 📄 LuxePass Backend — PRD (v2.0, à jour du code réel)

> Régénéré à partir d'une lecture ligne à ligne de `src/`, `prisma/schema.prisma`,
> `package.json` et `src/index.ts`. Remplace la v1.0, qui décrivait une API
> `/api/...` qui n'a jamais existé dans ce code.

## 1. Vision & Objectifs

LuxePass est une plateforme de conciergerie digitale pour l'hôtellerie de
luxe : check-in autonome avec scan de pièce d'identité, pass de séjour
(`stayId` + `stayToken` signé), concierge IA multilingue avec mémoire des préférences,
commandes room-service, signalement maintenance, et back-office staff/PMS
avec facturation (folios).

## 2. Stack technique réelle

- **Runtime** : Node.js / TypeScript, Express 4
- **Base de données** : PostgreSQL (Supabase) via **Prisma 5**, avec
  `@prisma/adapter-pg` (driver JS pur, pas de binaire natif — contournement
  volontaire pour compatibilité Termux/Android, cf. commentaire dans
  `src/prisma.ts`). `DATABASE_URL` = pooler transaction (port 6543),
  `DIRECT_URL` = connexion directe pour les migrations.
- **Persistance** : **déjà entièrement migrée sur Prisma/Postgres.** Les
  fichiers `src/store/*.ts` (dont `memoryStore.ts`) ont gardé leurs noms
  historiques mais interrogent tous Prisma — il n'y a plus de `Map()` en
  mémoire pour les données métier.
- **Auth** : `jsonwebtoken`, deux familles de secrets distinctes (tokens
  staff access/refresh vs. `sessionToken` de check-in), `bcryptjs` pour les
  mots de passe staff.
- **Validation** : `zod`, appliqué via un middleware générique `validate()`
  qui coerce et remplace `req.body/params/query`.
- **Upload** : `multer` (mémoire), filtre MIME (`jpeg`, `png`, `pdf`),
  limite configurable (`MAX_UPLOAD_MB`).
- **IA** : appel direct `fetch` à `https://api.anthropic.com/v1/messages`
  (pas de SDK), modèle configurable (`ANTHROPIC_MODEL`, défaut
  `claude-sonnet-5`), sortie contrainte en JSON strict.
- **OCR** : **stub non implémenté** — `ocr.service.ts` simule une latence
  et renvoie des champs vides. Aucun provider (Tesseract, Textract, Vision
  API...) n'est branché.
- **Sécurité HTTP** : `helmet`, `cors` (origin configurable), rate-limiting
  sur `/auth/login` (10 tentatives / 15 min / IP), gestion dédiée du
  header Private Network Access pour les previews Chrome en dev.
- **Autres** : `nanoid` (identifiants), `morgan` (logs).

Pas de Websockets/SSE (`socket.io` absent des dépendances), pas de suite
de tests (`jest`/`supertest` absents des devDependencies).

## 3. Montage des routes

Toutes les routes sont montées **à la racine**, sans préfixe `/api` :

```
app.use("/auth", authRouter);
app.use("/", checkinRouter);
app.use("/", staffRouter);
app.use("/", ordersRouter);
app.use("/", stayRouter);
app.use("/", pmsRouter);
app.use("/", conciergeRouter);
```

`GET /health` renvoie `{ ok, service, phase }`.

## 4. Authentification (`src/routes/auth.routes.ts`)

Réservée au staff (pas de compte "guest" — les invités passent par un
`sessionToken` puis un `stayToken` signé (JWT lié au séjour), sans mot de passe).

| Route | Description |
|---|---|
| `POST /auth/login` | Login staff (email + password), rate-limité. Retourne `accessToken` + `refreshToken`. Comparaison bcrypt exécutée même si l'email est inconnu (protection contre le timing attack). |
| `POST /auth/refresh` | Renouvelle l'access token à partir d'un refresh token valide (vérifie `tokenVersion`). |
| `POST /auth/change-password` | Change le mot de passe (staff authentifié), invalide tous les refresh tokens existants via incrément de `tokenVersion`, renvoie une nouvelle paire de tokens. |

Il n'existe **pas** de route `GET /auth/me`.

Middlewares clés (`src/middleware/auth.ts`) : `requireStaffAuth` (Bearer
token), `requireRole(...roles)`, `requireSameHotel(param)` (un membre du
staff n'agit que sur son hôtel, sauf `super_admin`).

## 5. Check-in & scan OCR (`src/routes/checkin.routes.ts`)

Pipeline en plusieurs étapes, chacune protégée par `requireCheckinSession`
(JWT `sessionToken` transmis en paramètre d'URL, pas en header) :

| Étape | Route | Effet |
|---|---|---|
| 1 | `POST /hotels/:hotelSlug/checkin-sessions` | Démarre une session, retourne un `sessionToken` (stage `started`). |
| 2 | `POST /checkin-sessions/:sessionToken/scan-id` | Upload du document d'identité (`idDocument`), appelle l'OCR → stage `scanned`. **Limité : 5 scans / 15 min par session** (429 `RATE_LIMIT_EXCEEDED`, en-têtes `Retry-After` et `RateLimit-*`), plus un plafond large de 60 / 15 min par IP. |
| 3 | `PATCH /checkin-sessions/:sessionToken/guest-data` | Le client confirme/corrige ses données → stage `guest_data`. |
| 3bis | `PATCH /checkin-sessions/:sessionToken/children` | Liste des enfants du séjour (optionnel). |
| 4 | `POST /checkin-sessions/:sessionToken/signature` | Exige que `guestData` existe → stage `signed`. |
| 5 | `POST /checkin-sessions/:sessionToken/payment-method` | Exige stage `signed` → empreinte bancaire (jamais de PAN/CVV stocké), stage `paid`. |
| 6 | `POST /checkin-sessions/:sessionToken/complete` | Exige stage `paid` → attribue la chambre, émet le `stayId` **et le `stayToken`** (JWT), stage `completed`. |
| — | `GET /stays/:stayId/qr-verify?token=...` | Vérifie la validité d'un QR de pass (comparaison au `stayId`, pas de HMAC dédié pour l'instant). |

Il n'existe pas de route `verify-reservation` ni de `confirm` unique — le
flux est décomposé en étapes séquentielles avec garde-fous d'ordre
(`ConflictError` si une étape est sautée).

## 6. Séjour actif (`src/routes/stay.routes.ts`)

Toutes les routes `/stays/:stayId/*` (sauf `qr-verify`, staff) exigent un
`stayToken` valide (`Authorization: Bearer` ou `X-Stay-Token`), émis pour ce `stayId`,
**ou** un JWT staff `reception` / `gm` (leur hôtel) / `super_admin` pour agir au nom du
client (`requireStayAuth`, monté sur `/stays/:stayId` dans `index.ts` ; erreurs
`stay_token_missing|invalid|expired` en 401, `forbidden` en 403 si le token est celui d'un autre séjour ; décodé dans `req.staySession`).
Elles exigent ensuite un séjour actif via `requireActiveStay(stayId)`
(stage `completed` ou `checked_out`). Payload du token :
`{ stayId, hotelId, room?, guestName, type: "stay_pass" }` ; durée de vie =
fin du jour de départ + 12 h, sinon 7 j (secret dédié `STAY_JWT_SECRET`).

| Route | Description |
|---|---|
| `POST` / `GET /stays/:stayId/service-requests` | Demandes de service (serviettes, late check-out...). Paiement requis seulement si `price > 0`. Cache court (4s) sur le GET pour absorber le polling front. |
| `POST` / `GET /stays/:stayId/maintenance-reports` | Signalements maintenance, avec ticket et cache court similaire. |
| `POST` / `GET` / `DELETE /stays/:stayId/notes` | Mémoire des préférences client. Le `DELETE` efface tout ("effacer mes données"). |
| `POST /stays/:stayId/checkout` | Clôture le séjour (à l'initiative du client). |

Il n'existe pas de route `GET /stay/active` ni `GET /stay/digital-pass` —
le pass numérique n'a pas d'endpoint dédié dans ce code.

## 7. Concierge IA (`src/routes/concierge.routes.ts`)

Une seule route : `POST /stays/:stayId/concierge/messages`
(`{ message, lang }` → `{ reply, sentiment, memoryNote, ticketCreated,
escalateToHuman, degraded }`).

- Construit un contexte (profil client, 8 dernières notes, 5 dernières
  demandes) envoyé à `ai.service.ts` avec un prompt système forçant une
  sortie JSON strict (`reply`, `sentiment`, `memoryNote`, `actionRequest`,
  `escalateToHuman`).
- Si `memoryNote` est renvoyé, il est sauvegardé automatiquement.
- Si `actionRequest` est renvoyé, un ticket de service est créé
  automatiquement (priorité dérivée du sentiment).
- **Mode dégradé** : si l'appel Anthropic échoue (`AiServiceError` — clé
  absente, erreur réseau, réponse non parsable...), un ticket est quand
  même créé avec le message brut, et une réponse de repli localisée
  (fr/en/ar) est renvoyée avec `degraded: true`.

Il n'existe pas de route `GET /concierge/recommendations`.

## 8. Commandes (`src/routes/orders.routes.ts`)

| Route | Description |
|---|---|
| `POST /stays/:stayId/orders` | Passation de commande (`requireActiveStayWithPayment`). |
| `GET /stays/:stayId/orders` | Historique + `folioTotal` calculé à la volée. Sert aussi d'historique — il n'y a pas de route séparée. |

Il n'existe pas de route `GET /orders/menu` — le catalogue de services vient
de `GET /hotels/:hotelSlug/services` côté module PMS (voir §10), pas du
module orders.

## 9. Module Staff (`src/routes/staff.routes.ts`)

Réservé aux rôles `reception`, `gm`, `super_admin` (housekeeping/maintenance
exclus, restriction RGPD documentée en commentaire — minimisation des
données, art. 5.1.c).

| Route | Description |
|---|---|
| `GET /hotels/:hotelId/pending-stays?status=pending_pms_entry` | Séjours complétés en attente de saisie dans le PMS de l'hôtel. |
| `PATCH /hotels/:hotelId/stays/:stayId/pms-sync-status` | Marque un séjour comme synchronisé PMS. |
| `POST /hotels/:hotelId/stays/:stayId/checkout` | Check-out digital par la réception (le séjour doit appartenir à l'hôtel). Le staff n'a pas le `stayToken` du client. |
| `GET /hotels/:hotelId/police-forms?date=YYYY-MM-DD` | Export des fiches de police (données d'identité complètes) pour une date d'arrivée donnée. |

Il n'existe pas de `GET /staff/dashboard` ni de `GET/PATCH /staff/requests`
génériques — ces besoins sont couverts par le module PMS (§10).

## 10. Module PMS / back-office (`src/routes/pms.routes.ts`)

Le plus étoffé des modules, entièrement protégé par `requireStaffAuth` +
`requireSameHotel` (+ `requireRole` selon la sensibilité) :

| Route | Description |
|---|---|
| `GET /hotels/:hotelId/active-stays` | Séjours en cours (réservé reception/gm/super_admin — RGPD). |
| `GET /hotels/:hotelId/live-feed` | Agrège tickets, maintenance, commandes et notes de l'hôtel en un seul appel. |
| `PATCH /hotels/:hotelId/service-requests/:requestId/status` | Change le statut d'une demande de service. |
| `PATCH /hotels/:hotelId/maintenance-reports/:reportId/status` | Idem pour un signalement maintenance. |
| `PATCH /hotels/:hotelId/orders/:orderId/status` | Idem pour une commande. |
| `GET /hotels/:hotelId/folios` | Facturation par séjour actif (commandes + demandes payantes), avec `grandTotal`. |
| `GET /hotels/:hotelSlug/services?lang=fr\|en\|ar` | Catalogue de services public, traduit à la volée via l'IA si `lang != fr` (cache 8s), fallback FR silencieux si la traduction échoue. |
| `GET` / `PATCH /hotels/:hotelId/pms-state` | État générique JSON pour les modules PMS sans modèle Prisma dédié (réservations, yield, CRM...). |
| `GET` / `POST` / `DELETE /hotels/:hotelId/staff` | Gestion des comptes staff (réservé gm/super_admin ; un compte ne peut pas se supprimer lui-même). |

Il n'existe pas de `GET /pms/rooms` ni de `POST /pms/sync` génériques — ce
module couvre un périmètre bien plus large que ce que ces deux endpoints
suggéraient.

## 11. Modèle de données (`prisma/schema.prisma`)

`Hotel`, `Staff` (rôle enum : `reception`, `gm`, `housekeeping`,
`maintenance`, `super_admin`), `CheckinSession` (stage enum : `started` →
`scanned` → `guest_data` → `signed` → `paid` → `completed` →
`checked_out`), `Order`, `ServiceRequest`, `MaintenanceReport`, `Note`,
`PmsState`. `guestData`, `children`, `paymentMethod` sont stockés en JSON
pour coller au contrat Zod existant sans dupliquer chaque champ en colonne.

## 12. Sécurité — points déjà traités

- Fail-fast au démarrage si un secret critique manque en production
  (`config.ts`) ; refuse aussi un secret resté à sa valeur `change-moi`
  par défaut.
- Rate-limiting anti brute-force sur le login.
- Timing-safe login (comparaison bcrypt même compte inexistant).
- Accès aux données d'identité (guestData, fiches de police) restreint par
  rôle (RGPD, minimisation).
- Aucun PAN/CVV stocké côté serveur pour le paiement.

## 13. Prochaines étapes réellement en suspens

1. **Brancher un vrai provider OCR** (`ocr.service.ts` est un stub qui ne
   renvoie que des champs vides).
2. **Websockets / SSE** pour remplacer le polling front actuel (repose
   aujourd'hui sur un cache court de 4-8s côté serveur).
3. **Tests automatisés** (Jest/Supertest) sur le flux check-in et
   l'authentification — aucun test présent à ce stade.
4. ~~Durcir le token de séjour post-check-in~~ — **fait** (ACTION 1, Phase 0 :
   `stayToken` JWT). Reste : révocation côté serveur et reprise du séjour sur
   un autre appareil (cf. README §11, points ouverts).
5. Remplacer la comparaison simple du `token` de `qr-verify` par un HMAC
   dédié si le QR doit porter de vraies garanties anti-rejeu.

> ⚠️ Contrairement à la v1.0 de ce PRD, la migration des stores en mémoire
> vers Prisma est **déjà faite** — ce n'est plus une étape à venir.
