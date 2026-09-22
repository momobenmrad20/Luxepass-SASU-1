# LuxePass — Test local du parcours check-in (frontend + backend)

## 1. Backend — luxepass-backend/ (TypeScript, store in-memory, PAS de Postgres requis)

Dans le dossier `luxepass-backend/` (celui que tu as fourni) :

```bash
npm install
cp .env.example .env
# Édite .env si besoin (CORS_ORIGIN doit correspondre au port du frontend, voir plus bas)
npm run dev
# → LuxePass backend (Phase 0) — http://localhost:4000
```

Pas de PostgreSQL, pas de migration à lancer pour ce backend — tout est en
mémoire (perdu à chaque redémarrage du process, ce qui est très bien pour du
test).

⚠️ **CORS_ORIGIN** dans `.env` doit être `http://localhost:5173` (le port de
Vite ci-dessous), pas `http://localhost:3000` (valeur par défaut du
`.env.example`) :
```
CORS_ORIGIN=http://localhost:5173
```

## 2. Frontend (ce dossier)

```bash
npm install
npm run dev
```

Ouvre l'URL affichée (normalement `http://localhost:5173`).

## 3. Si le port du backend change

Édite `index.html`, ligne `window.__LUXEPASS_API_BASE__` — c'est la seule
chose à changer, `apiClient.js` la lit automatiquement.

## Notes

- Hôtel de démo côté backend : slug `oceana` (déjà aligné avec
  `HOTELS[0].id` du frontend, "Oceana Hotel & Spa" — clique sur cette carte
  pour tester le check-in, pas sur "Hôtel Magic Resort" qui n'a pas
  d'équivalent côté backend).
- Compte staff de démo : `reception@ocean-a-suites.tn` / `password123`
  (pas utilisé par le parcours check-in lui-même, qui n'a pas besoin
  d'authentification staff).
- Tailwind est chargé via CDN dans `index.html` pour ce test — pas adapté
  à la prod.
- `storagePolyfill.js` émule `window.storage` via `localStorage` pour les
  onglets PMS/Admin (hôtels partenaires, état par hôtel) — local à ton
  navigateur uniquement. Le parcours check-in, lui, ne dépend plus de
  `window.storage` : il parle directement au vrai backend via `apiClient.js`.
