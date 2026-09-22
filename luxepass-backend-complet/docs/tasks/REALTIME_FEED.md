# Plan d'action — Temps réel pour le live-feed & les commandes (module PMS)

> Statut : **plan uniquement, aucun code modifié.** Référence : `docs/PRD.md`
> (v2.0). Portée : `GET /hotels/:hotelId/live-feed` et les commandes
> (`orders`), ainsi que `service-requests` / `maintenance-reports` / `notes`
> qui alimentent ce flux.

## 0. Constat sur l'existant

Le "temps réel" actuel repose entièrement sur du **polling front + cache
court côté serveur** (`src/utils/shortCache.ts`, TTL 4s sur
service-requests/maintenance-reports, 8s sur le catalogue de services).
Le cache est **local au process** (pas de Redis) — ça fonctionne en
mono-instance mais ne se partage pas si le backend scale horizontalement.
Aucune dépendance temps réel (`socket.io`, `ws`) n'est présente dans
`package.json`.

Points d'écriture actuels qui devront déclencher un événement une fois le
temps réel en place :
- `stay.routes.ts` → création `service-requests`, `maintenance-reports`, `notes`
- `orders.routes.ts` → création de commande
- `pms.routes.ts` → changement de statut (`service-requests/:id/status`,
  `maintenance-reports/:id/status`, `orders/:id/status`)
- `concierge.routes.ts` → création automatique de ticket par l'IA

## 1. Choix d'architecture : SSE plutôt que WebSockets

**Recommandation : Server-Sent Events (SSE).**

Justification :
- Le flux est **unidirectionnel serveur → client** (le staff *reçoit* des
  mises à jour ; il n'a pas besoin d'émettre sur le même canal — les
  actions staff passent déjà par les routes REST existantes).
- SSE tourne nativement sur HTTP/1.1 via Express, sans nouvelle
  dépendance ni nouveau protocole à faire passer les proxys/reverse-proxys
  existants (contrairement à `ws`/`socket.io` qui demandent un upgrade
  HTTP dédié).
- Reconnexion automatique gérée nativement par `EventSource` côté
  navigateur (`retry`, `Last-Event-ID`), ce qui réduit le code client à
  écrire.
- Cohérent avec l'infra actuelle : un seul process Express, pas de
  bibliothèque supplémentaire à auditer/maintenir.

À réévaluer vers WebSockets uniquement si un besoin bidirectionnel
apparaît (ex : un futur chat staff↔staff en direct) — pas le cas ici.

## 2. Authentification du flux SSE

`EventSource` ne permet pas d'ajouter un header `Authorization` custom.
Deux options :

- **Retenue** : un token de courte durée dédié au streaming, transmis en
  query param (`?stream_token=...`), généré via un nouvel endpoint
  `POST /hotels/:hotelId/live-feed/stream-token` (protégé par
  `requireStaffAuth` classique comme les autres routes PMS) qui retourne
  un JWT signé avec un secret propre (`STREAM_SESSION_SECRET`, sur le
  modèle de `CHECKIN_SESSION_SECRET`), TTL court (ex. 60s, juste le temps
  d'ouvrir la connexion SSE).
- Écartée pour l'instant : passer l'access token staff classique en query
  param — évite une clé de plus mais expose un token de 15 min de durée
  de vie dans les logs d'accès/proxy, moins bon compromis.

Le endpoint SSE lui-même (`GET /hotels/:hotelId/live-feed/stream`) valide
ce `stream_token`, vérifie `hotelId` (même logique que
`requireSameHotel`), puis ouvre la connexion.

## 3. Bus d'événements interne

- Ajouter `src/events/hotelEventBus.ts` : un `EventEmitter` Node natif,
  une instance unique par process (comme `prisma` singleton), avec une
  méthode `publish(hotelId, event)` et `subscribe(hotelId, handler)`.
- Payload d'événement typé : `{ type: "service_request.created" |
  "service_request.updated" | "maintenance.created" | "maintenance.updated"
  | "order.created" | "order.updated" | "note.added", data: unknown }`.
- **Limite connue, assumée pour cette phase** : comme `shortCache`, ce bus
  est local au process. En mono-instance (situation actuelle), aucun
  problème. À la première mise à l'échelle horizontale, il faudra migrer
  vers un pub/sub partagé (Redis `PUBLISH`/`SUBSCRIBE`, ou équivalent
  managé Supabase Realtime) — noté comme dette explicite, pas bloquant
  pour livrer la V1 du temps réel.

## 4. Endpoint SSE

`GET /hotels/:hotelId/live-feed/stream`
- Auth : `stream_token` (query) + vérification `hotelId`.
- Headers : `Content-Type: text/event-stream`, `Cache-Control: no-cache`,
  `Connection: keep-alive`.
- À la connexion : envoyer un premier événement `snapshot` avec l'état
  actuel (réutilise la logique déjà présente dans `GET
  /hotels/:hotelId/live-feed`), pour que le front n'ait pas de trou entre
  le chargement initial et le premier événement poussé.
- Ensuite : `hotelEventBus.subscribe(hotelId, ...)`, chaque événement est
  écrit au format SSE (`event: <type>\ndata: <json>\n\n`).
- Heartbeat toutes les ~20s (commentaire vide `:\n\n`) pour garder la
  connexion ouverte à travers les proxys/LB qui coupent les connexions
  HTTP inactives.
- Sur `req.on("close")` : désabonner proprement (`unsubscribe`) pour
  éviter une fuite de listeners.

## 5. Câblage des routes existantes

Dans chaque route d'écriture listée en §0, après le succès de l'opération
Prisma (et l'`invalidate`/`invalidatePrefix` déjà en place sur
`shortCache`), ajouter un appel `hotelEventBus.publish(hotelId, {...})`.
Aucun changement de contrat de réponse REST — l'appel au bus est un effet
de bord additionnel, pas un remplacement.

## 6. Ce qui ne change pas (compatibilité)

- Les routes REST existantes (`GET /live-feed`, `GET /stays/:stayId/...`,
  etc.) restent en place telles quelles, pour :
  - le chargement initial (avant ouverture du flux SSE),
  - les clients qui n'ouvrent pas de flux (fallback réseau/proxy
    restrictif),
  - la vue "séjour" client (mobile), qui reste hors périmètre de ce plan
    (seul le back-office staff est visé ici).
- `shortCache` reste utile pour ces routes REST classiques, indépendamment
  du flux SSE.

## 7. Étapes de mise en œuvre (ordre recommandé)

1. `src/utils/jwt.ts` : ajouter `signStreamToken` / `verifyStreamToken`
   (nouveau secret `STREAM_SESSION_SECRET`, TTL court) + entrée
   correspondante dans `src/config.ts` (`required(...)`, sur le modèle de
   `checkin.sessionSecret`).
2. `src/events/hotelEventBus.ts` : implémenter le bus (`EventEmitter`
   + types d'événements).
3. `src/routes/pms.routes.ts` :
   - ajouter `POST /hotels/:hotelId/live-feed/stream-token`,
   - ajouter `GET /hotels/:hotelId/live-feed/stream` (SSE).
4. Câbler `hotelEventBus.publish(...)` dans `stay.routes.ts`,
   `orders.routes.ts`, `pms.routes.ts` (routes de statut),
   `concierge.routes.ts` (ticket auto).
5. Tests manuels avec `curl -N` (flux SSE brut) avant intégration front.
6. Intégration front : ouverture `EventSource` après récupération du
   `stream_token`, merge des événements dans l'état local (remplace le
   polling actuel sur `live-feed` uniquement — les autres endpoints
   restent en polling pour l'instant, cf. §6).
7. Ajouter des tests automatisés (Jest/Supertest) sur : émission d'un
   événement après création de ticket/commande, expiration du
   `stream_token`, fermeture propre de connexion.
8. Documenter dans `docs/PRD.md` une fois livré (nouvelle section §14,
   remplacement du point "Websockets/SSE" en §13).

## 8. Risques identifiés

- **Scaling horizontal** : bus événementiel non partagé entre instances
  (cf. §3) — acceptable pour la Phase pilote actuelle, à traiter avant
  d'ouvrir plusieurs instances backend en production.
- **Connexions SSE longues derrière un reverse proxy** (Nginx, etc.) :
  vérifier `proxy_buffering off` / timeouts suffisants au déploiement —
  hors périmètre de ce repo mais à ne pas oublier côté infra.
- **Fuite de listeners** si `req.on("close")` n'est pas géré correctement
  → prévoir un test dédié.
