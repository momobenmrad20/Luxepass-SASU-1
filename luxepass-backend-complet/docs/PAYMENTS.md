# Paiement en ligne (Stripe PaymentIntents)

Remplace le jeton factice `dev_placeholder_…` **pour les commandes payées en ligne**
(room service, spa). Aucune donnée de carte ne traverse ce backend.

## Flux

```
Navigateur                     Backend LuxePass                  Stripe
    │  POST /payments/create-intent  │                               │
    │  {stayId,category,items,amount,currency}                       │
    │ ─────────────────────────────► │ prix recalculés (catalogue)   │
    │                                │ ── paymentIntents.create ───► │
    │ ◄───── {paymentId, clientSecret, total} ───                    │
    │  stripe.confirmPayment(clientSecret)  ── PAN/CVV direct ─────► │
    │                                │ ◄── webhook signé ─────────── │
    │                                │  payment_intent.succeeded     │
    │                                │  → Payment PAID + Order       │
    │                                │  → live-feed « order.created »│
    │  GET /stays/:stayId/payments/:paymentId  (poll jusqu'à PAID)   │
```

Seul le **webhook** fait foi. Le retour de `confirmPayment` côté navigateur sert à
l'affichage, pas à la comptabilité.

## Contrat pour le frontend

`POST /payments/create-intent` — en-tête `Authorization: Bearer <stayToken>` (ou
`X-Stay-Token`), en-tête optionnel `Idempotency-Key` (16–80 car. `[A-Za-z0-9_-]`, à
générer **une fois par panier validé**, pas à chaque clic).

```json
{ "stayId": "stay_…", "category": "room_service", "currency": "TND",
  "amount": 102, "items": [{ "id": "m1", "qty": 2 }, { "id": "m2", "qty": 1 }] }
```

- `items[].price` / `items[].name` sont **ignorés** : le prix vient du catalogue serveur.
- `amount` = total affiché au client (unités principales). Écart avec le total serveur →
  `409 price_mismatch` + `details.serverTotal` : rafraîchir l'écran, ne pas réessayer tel quel.
- Réponse `201` : `{ paymentId, clientSecret, total, currency }` (`Cache-Control: no-store`).
- Erreurs métier : `422 unknown_item` · `422 unsupported_currency` · `409 conflict`
  (séjour clôturé, commande déjà réglée) · `429` · `503 payments_disabled` /
  `catalog_unavailable` · `502 payment_provider_error`.

`GET /stays/:stayId/payments/:paymentId` → `{ paymentId, status: PENDING|PAID|FAILED, total,
currency, orderId }`. `FAILED` n'est pas terminal : le client peut réessayer sur le même
`clientSecret`.

Côté React : remplacer les champs carte maison (`card.number`, `card.cvv`… dans
`LuxePass.jsx`) par le **Payment Element** de `@stripe/react-stripe-js`, initialisé avec la
clé **publique** `pk_…` (variable Vite `VITE_STRIPE_PUBLISHABLE_KEY`).

## Mise en route

Depuis un PC (le CLI Prisma ne tourne pas sous Termux, cf. README) :

```bash
npm install stripe                         # ajoute la dépendance au package.json
npm run db:migrate -- --name add_payments  # table payments + orders.paymentId
npm run db:seed:catalog                    # carte + services (source des prix) → pms_state
```

Renseigner `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYMENT_CURRENCY` (`.env.example`).

## Tests

```bash
npm test    # money, catalogPricing, signature du webhook (payments.webhook.test.ts)
```

De bout en bout (mode test Stripe, n'importe quelle devise) :

```bash
stripe listen --forward-to localhost:4000/payments/webhook   # affiche le whsec_…
# 1. create-intent avec un stayToken valide, 2. confirmer avec la carte 4242 4242 4242 4242
#    → Payment PAID, Order créée, événement order.created sur le live-feed
# Échec : carte 4000 0000 0000 9995 → Payment FAILED (failureCode = insufficient_funds)
# Rejeu : `stripe events resend evt_…` → aucun doublon de commande
```

## Sécurité — ce que le code garantit

| Risque | Parade |
|---|---|
| Client qui triche sur le prix | Prix/libellés lus dans `pms_state` ; `amount` client = simple contrôle |
| Webhook forgé | `constructEvent` sur le corps **brut** + secret `whsec_…` ; rien n'est lu avant |
| Livraison en double / dans le désordre | `updateMany` conditionnel, `PAID` jamais rétrogradé, commande créée dans la même transaction SQL |
| Double facturation | `Order.paymentId` ; les folios exposent `balanceDue` (hors commandes déjà payées) |
| Card testing / abus | Limiteur par IP + par séjour, `stayToken` obligatoire (le staff ne peut pas déclencher de paiement) |
| Fuite de secrets | Clés validées au démarrage (format, `pk_` refusée, obligatoires en prod), jamais loguées |

## À faire avant la production

1. **Compte Stripe / pays** : d'après les sources consultées (20/09/2026), Stripe n'ouvre pas
   de compte marchand directement à une société tunisienne (contournement usuel : entité
   dans un pays supporté, ex. Atlas/US). À trancher avant tout le reste, avec la banque et
   l'expert-comptable de l'hôtel. Le SDK est isolé dans `paymentService.ts` : changer de PSP
   local revient à réécrire ce fichier et le handler du webhook, pas le reste. La devise TND est
   listée par Stripe comme devise à 3 décimales (à confirmer pour le pays de votre compte).
2. **Frontend** : supprimer la saisie carte maison ; une page qui ne fait que charger
   Stripe Elements relève de **SAQ A** (le plus léger), une saisie maison de **SAQ A-EP/D**.
3. **Folio** : l'UI staff doit encaisser `balanceDue`, pas `total`.
4. **Check-in** : l'empreinte de carte (`POST …/payment-method`, `pspToken`) est **toujours**
   un stub — c'est un autre objet Stripe (SetupIntent), non couvert ici.
5. **`POST /stays/:stayId/orders`** (facturation sur le folio) accepte encore `price` du client
   (`schemas.ts`, `orderItemSchema`) : même correctif à prévoir.
6. Bus SSE en mémoire : si le backend passe à plusieurs instances, un webhook traité par
   l'instance B n'atteint pas les abonnés de l'instance A (cf. `hotelEventBus.ts`).

## Fichiers

Nouveaux : `services/paymentService.ts`, `services/catalogPricing.ts`, `utils/money.ts`,
`routes/payments.routes.ts`, `middleware/requireStayAuthFromBody.ts`,
`prisma/seed-catalog.ts`, `prisma/catalog.oceana.json` + 3 fichiers de test.
Modifiés : `schema.prisma` (Payment, PaymentStatus, Order.paymentId), `config.ts`
(bloc `payments`), `schemas.ts`, `index.ts` (webhook AVANT `express.json()`),
`publicRateLimit.ts`, `ordersStore.ts`, `pmsStateStore.ts` (clé `menu`),
`orders.routes.ts` et `pms.routes.ts` (`balanceDue`), `.env.example`, `package.json` (script seed).
