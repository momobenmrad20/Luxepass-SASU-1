# LuxePass — monorepo (client / pms / admin)

Restructuration effectuée à partir de `luxepass-frontend-decoupe.zip`. Aucune logique métier n'a été réécrite : les fichiers ont été déplacés, et seuls les chemins d'import ont changé (`../../hooks/...` → `@shared/hooks/...`). Le détail complet des choix est dans `LuxePass-architecture-3-apps.md` (déjà partagé).

**Nouveautés ajoutées par rapport à l'ancien code** (au-delà du déplacement de fichiers) :
- `apps/admin/src/contexts/AdminAuthContext.jsx` + `AdminLoginScreen.jsx` : l'ancien rôle "admin" n'avait aucune authentification, c'est corrigé ici (voir le fichier pour le détail — nécessite un rôle `SUPER_ADMIN` côté backend, voir Checklist backend plus bas).
- `packages/shared/src/contexts/AppStateContext.jsx` : ajout d'un paramètre `initialRole` (défaut `"client"`, non cassant) pour que chaque app fixe son rôle dès le départ.
- `apps/pms/src/App.jsx` : l'hôtel affiché est dérivé de `staffHotelId` (la session), plus de `selectedHotel` partagé entre apps (impossible une fois déployées séparément).
- `apps/admin/src/App.jsx` : "Ouvrir le PMS" depuis Super Admin ouvre désormais `pms.luxepass.com` dans un nouvel onglet (le staff doit s'y connecter normalement), au lieu de changer un état local partagé.

## Utilisation en local

```bash
npm install               # à la racine, une seule fois (installe les 3 apps + le package shared)
npm run dev:client        # http://localhost:5173
npm run dev:pms           # http://localhost:5174
npm run dev:admin         # http://localhost:5175
```

Copier chaque `.env.example` en `.env` dans `apps/client`, `apps/pms`, `apps/admin` si besoin de surcharger `VITE_API_BASE` (par défaut, chaque app pointe sur `https://api.luxepass.com` si aucune variable n'est définie — à corriger en local vers `http://localhost:4000`).

## ⚠️ Non testé automatiquement

Ce sandbox n'a pas d'accès réseau : `npm install` / `vite build` n'ont **pas** pu être exécutés ici pour vérifier que ça compile. Avant de pousser sur GitHub, lancer en local :

```bash
npm install
npm run build:all
```

et corriger les éventuelles erreurs d'import qu'un `grep` ne peut pas détecter (typo, casse de fichier sur un OS case-sensitive, etc.).

## Checklist backend (obligatoire avant la bascule)

- [ ] `luxepass-backend` : cookies de session avec `Domain=.luxepass.com; SameSite=None; Secure` (au lieu du cookie mono-domaine actuel).
- [ ] `luxepass-backend` : CORS limité à `https://app.luxepass.com`, `https://pms.luxepass.com`, `https://admin.luxepass.com` avec `credentials: true`.
- [ ] `luxepass-backend` : créer le rôle `SUPER_ADMIN` (compte sans `hotelId`) + un middleware qui l'exige sur toutes les routes `/admin/*` (à créer si elles n'existent pas encore).
- [ ] Vérifier que chaque route `/hotels/:hotelId/*` compare bien `:hotelId` à `req.staff.hotelId` avant toute lecture/écriture (isolation multi-hôtel réelle, pas seulement côté frontend).

## Checklist déploiement Cloudflare Pages (exacte, par app)

Répéter ces étapes **3 fois** (client / pms / admin) :

1. Dashboard Cloudflare → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
2. Choisir le dépôt GitHub du monorepo (le pousser d'abord si ce n'est pas déjà fait).
3. Nom du projet : `luxepass-client` (puis `luxepass-pms`, `luxepass-admin`).
4. **Build settings** :
   | Champ | client | pms | admin |
   |---|---|---|---|
   | Root directory | `apps/client` | `apps/pms` | `apps/admin` |
   | Build command | `npm install --workspace=apps/client --include-workspace-root && npm run build --workspace=apps/client` | idem en remplaçant `client` par `pms` | idem en remplaçant `client` par `admin` |
   | Build output directory | `dist` | `dist` | `dist` |
5. **Environment variables** (Production) : voir chaque `.env.example` du dossier correspondant — les ajouter telles quelles avec les vraies valeurs (clé Stripe live pour `client`, etc.).
6. Déployer une première fois (donne une URL `*.pages.dev` de test — vérifier que l'app se charge avant de brancher le vrai domaine).
7. **Custom domains** (dans le projet Pages) → **Set up a custom domain** → entrer `app.luxepass.com` (resp. `pms.`, `admin.`). Cloudflare propose d'ajouter automatiquement le CNAME si le domaine `luxepass.com` est déjà sur ce compte Cloudflare — sinon créer manuellement dans **DNS** :
   - Type `CNAME`, nom `app` (resp. `pms`, `admin`), cible `luxepass-client.pages.dev` (resp. les 2 autres), proxy activé (nuage orange).
8. SSL/TLS : laisser en mode **Full** ou **Full (strict)** (Cloudflare le gère automatiquement pour Pages, rien à faire de plus si le domaine est déjà sur Cloudflare).
9. Vérifier `apps/<app>/public/_redirects` (déjà créé ici, contenu `/* /index.html 200`) — indispensable pour que le refresh sur une route interne (ex. `pms.luxepass.com/reservations`) ne renvoie pas une 404.
10. Une fois les 3 apps + `api.luxepass.com` en place, tester la checklist de sécurité et de tests du document d'architecture (§15-16) avant d'annoncer la bascule.

**Rollback** : dans chaque projet Pages, onglet **Deployments** → choisir un déploiement précédent → **Rollback to this deployment**. Aucune commande nécessaire.
