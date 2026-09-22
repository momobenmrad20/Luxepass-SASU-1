# LuxePass Backend — Phase 1 (Postgres / Prisma)

API Express/TypeScript implémentant le contrat défini dans `schemas.ts`.
**Migration Phase 1** : les stores in-memory (Map()) ont été remplacés par
Prisma + Postgres — les données survivent désormais au redémarrage du process.

## Installation (Supabase)

1. Créer un projet sur [supabase.com](https://supabase.com) — **choisir une
   région dans l'UE** (ex. `eu-central-1` Francfort ou `eu-west-1` Irlande)
   pour l'hébergement des données personnelles clients (RGPD).
2. Dans *Project Settings > Database > Connection string*, récupérer :
   - la chaîne **Transaction pooler** (port `6543`) → `DATABASE_URL`
   - la chaîne **directe** (port `5432`) → `DIRECT_URL` (nécessaire aux
     migrations, le pooler ne les supporte pas)
3. Configurer et lancer :

```bash
npm install                    # installe aussi Prisma Client (postinstall)
cp .env.example .env           # coller DATABASE_URL, DIRECT_URL, secrets JWT
npm run db:migrate             # crée les tables sur Supabase
npm run db:seed                # hôtel + comptes staff de démo
npm run dev                    # démarre sur http://localhost:4000
```

En production (déploiement automatisé), utiliser `npm run db:migrate:deploy`
plutôt que `db:migrate` (n'interroge jamais un terminal interactif).

## Arborescence

```
prisma/
  schema.prisma               # modèles Hotel, Staff, CheckinSession, Order,
                               # ServiceRequest, MaintenanceReport, Note, PmsState
  seed.ts                     # hôtel Oceana + comptes staff de démo
src/
  prisma.ts                   # client Prisma singleton (adapter pg — compatible Termux)
  config.ts                   # lecture/validation des variables d'env
  schemas.ts                  # schémas Zod par endpoint
  utils/
    errors.ts
    jwt.ts
    requireActiveStay.ts      # async depuis la migration Prisma
  middleware/
    validate.ts
    auth.ts
    checkinSession.ts          # async depuis la migration Prisma
    upload.ts
    errorHandler.ts
    asyncHandler.ts
  services/
    ocr.service.ts             # stub OCR (à remplacer par un vrai provider)
    ai.service.ts               # concierge IA (Anthropic)
  store/                        # tous async, backés par Prisma/Postgres
    memoryStore.ts               # hôtels + comptes staff (nom conservé)
    checkinStore.ts               # sessions de check-in
    ordersStore.ts
    serviceRequestsStore.ts
    maintenanceStore.ts
    notesStore.ts
    pmsStateStore.ts
  routes/
    auth.routes.ts               # /auth/login (+ rate limiting), /refresh, /change-password
    checkin.routes.ts            # flux client complet
    staff.routes.ts              # pont vers l'ancien PMS (accès restreint par rôle)
    orders.routes.ts
    stay.routes.ts
    concierge.routes.ts
    pms.routes.ts
  index.ts                       # assemblage Express
```

## Compte de démonstration (seed)

- Hôtel : `oceana` (id : `hotel_ocean_asuites`)
- Staff réception : `reception@ocean-a-suites.tn` / `password123`
- Staff GM : `gm@ocean-a-suites.tn` / `password123`

⚠️ Mots de passe de démo volontairement faibles — à changer ou supprimer
avant tout accès par de vrais membres du staff.

## Exécution sous Termux (Android)

Le moteur natif de Prisma (binaire Rust) est incompatible avec la libc
d'Android (bionic), même en arm64 — erreur typique :
`PrismaClientInitializationError: ... EM_X86_64 (62) instead of EM_AARCH64 (183)`
(ou l'inverse selon le binaire téléchargé).

**Solution en place** : `src/prisma.ts` utilise le *driver adapter*
`@prisma/adapter-pg` (`previewFeatures = ["driverAdapters"]` dans
`schema.prisma`). Les requêtes passent par le driver `pg`, en JavaScript
pur — plus aucun binaire natif à charger au runtime. Le serveur applicatif
(`npm run dev` / `npm start`) tourne donc normalement sous Termux.

**Limite qui reste** : la CLI Prisma elle-même (`prisma generate`,
`prisma migrate`) embarque ses propres binaires natifs (schema engine),
soumis au même problème. Sur Termux :
1. Faites `prisma generate` et les migrations (`npm run db:migrate` /
   `db:migrate:deploy`) depuis un environnement Linux/macOS/Windows
   classique (votre PC, ou tout autre environnement de build) — elles
   n'écrivent que dans Supabase (base distante) et dans
   `node_modules/@prisma/client` (généré).
2. Ensuite, sur Termux, faites simplement `npm install` (le `postinstall`
   relance `prisma generate` — si ça échoue à cette étape précise sur
   Termux, réessayez avec `npm install --ignore-scripts` puis copiez le
   dossier `node_modules/.prisma` généré ailleurs).
3. `npm run dev` / `npm start` fonctionne ensuite normalement, requêtes
   comprises — seule la partie CLI (generate/migrate) doit passer par un
   environnement classique.

```bash
npm run db:migrate          # applique le schéma en dev (crée une migration)
npm run db:migrate:deploy   # applique les migrations en prod (CI/CD)
npm run db:seed             # (ré)exécute le seed de démo
npm run db:studio           # interface graphique pour inspecter les données
```

## Points d'attention restants avant la mise en prod complète

- **OCR** : `ocr.service.ts` est encore un stub — brancher un vrai provider
  (le contrat de sortie respecte déjà `guestDataFieldsSchema`).
- **Chiffrement au repos** : les champs `guestData` (n° pièce d'identité) et
  `signatureDataUrl` sont stockés en clair dans Postgres. Évaluer un
  chiffrement applicatif (ou au niveau colonne) selon le provider retenu,
  avant d'y faire transiter de vraies données clients.
- **Politique de rétention** : définir la durée de conservation des scans
  d'identité / signatures / fiches de police et mettre en place la purge
  automatique correspondante (obligations légales françaises sur les fiches
  de police notamment).
- **QR de vérification** : `qr-verify` compare simplement le `stayId` ; pour
  résister à un rejeu plus poussé, prévoir un HMAC dédié signé à la
  complétion du check-in.
- **Rate limiting** : en place sur `/auth/login` — à étendre si besoin à
  d'autres endpoints publics (ex: `/hotels/:slug/checkin-sessions`).
- **Logs/PII** : les logs `morgan` n'incluent pas les bodies — vérifier
  qu'aucun champ sensible (idNumber, pspToken) ne finit dans un logger tiers.
- **Sauvegardes** : Supabase fait des backups quotidiens automatiques sur les
  plans payants (Pro et +) ; le plan gratuit n'en a pas. Vérifier le plan
  souscrit et activer le **Point-in-Time Recovery** si besoin d'une
  granularité plus fine avant le pilote. Tester une restauration au moins
  une fois.
- **Région** : confirmer que le projet Supabase est bien en région UE
  (Project Settings > General) — condition pour éviter un transfert de
  données hors UE sans base légale (RGPD).
