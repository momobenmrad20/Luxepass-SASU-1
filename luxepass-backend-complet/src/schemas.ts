// ═════════════════════════════════════════════════════════════
// LuxePass — Schémas de validation Zod (Phase 0 : check-in seul)
// Un schéma par endpoint défini dans phase0_api_checkin.md
// ═════════════════════════════════════════════════════════════

import { z } from "zod";

// ─────────────────────────────────────────────
// Fragments réutilisables
// ─────────────────────────────────────────────

const uuidSchema = z.string().uuid();

const hotelSlugSchema = z
  .string()
  .min(2)
  .max(50)
  .regex(/^[a-z0-9-]+$/, "slug attendu (minuscules, chiffres, tirets)");

// Un JWT de session de check-in — on ne valide que la forme, pas la signature ici
// (la signature est vérifiée par le middleware d'auth, pas par le schéma de payload)
const sessionTokenSchema = z.string().min(20);

// ─────────────────────────────────────────────
// 1. Auth staff
// ─────────────────────────────────────────────

export const staffLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// refreshToken optionnel : le chemin normal (client web) le lit depuis le
// cookie HttpOnly `staff_refresh` (cf. utils/cookies.ts) ; il ne reste
// nécessaire dans le corps que pour un client Bearer sans cookie (mobile/API).
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72), // 72 = limite bcrypt
}).refine((d) => d.newPassword !== d.currentPassword, {
  message: "Le nouveau mot de passe doit être différent de l'ancien",
  path: ["newPassword"],
});

// ─────────────────────────────────────────────
// 2. Démarrage d'un check-in
// ─────────────────────────────────────────────

// POST /hotels/:hotelSlug/checkin-sessions — pas de body, seulement le param d'URL
export const checkinSessionParamsSchema = z.object({
  hotelSlug: hotelSlugSchema,
});

// ─────────────────────────────────────────────
// 3. Scan OCR
// ─────────────────────────────────────────────

export const scanIdParamsSchema = z.object({
  sessionToken: sessionTokenSchema,
});

// Le fichier lui-même est validé au niveau middleware multipart (type MIME, taille max),
// pas ici — Zod ne valide que le reste du payload le cas échéant (aucun champ additionnel
// attendu dans le body pour cet endpoint).

const guestDataFieldsSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  age: z.coerce.number().int().min(0).max(130),
  gender: z.enum(["M", "F", "X"]),
  idNumber: z.string().min(3).max(50),
  profession: z.string().max(150).optional().default(""),
  from: z.string().max(150),
  destination: z.string().max(150),
  arrival: z.string().date(), // format YYYY-MM-DD
  departure: z.string().date(),
  // Nombre total d'occupants de la chambre (le signataire inclus) — sert
  // au calcul des forfaits facturés par nuitée et par personne (ex: le
  // forfait Conciergerie & Bien-être).
  occupants: z.coerce.number().int().min(1).max(10).optional().default(1),
}).refine((d) => d.departure >= d.arrival, {
  message: "La date de départ doit être postérieure ou égale à la date d'arrivée",
  path: ["departure"],
});

// PATCH /checkin-sessions/:sessionToken/guest-data
export const patchGuestDataSchema = guestDataFieldsSchema;

// ─────────────────────────────────────────────
// 4. Signature
// ─────────────────────────────────────────────

// data URL type "data:image/png;base64,...."
const dataUrlSchema = z
  .string()
  .regex(/^data:image\/(png|jpeg);base64,/, "format data URL image attendu")
  .max(2_000_000, "signature trop volumineuse"); // ~1.5MB décodé, marge pour l'encodage base64

export const postSignatureSchema = z.object({
  signatureDataUrl: dataUrlSchema,
});

// ─────────────────────────────────────────────
// 5. Paiement — jamais de PAN/CVV ici, uniquement le token renvoyé par le PSP
// ─────────────────────────────────────────────

export const postPaymentMethodSchema = z.object({
  pspToken: z.string().min(10),
  last4: z.string().regex(/^\d{4}$/),
  brand: z.enum(["Visa", "Mastercard", "Amex", "Other"]),
});

// ─────────────────────────────────────────────
// 6. Finalisation du check-in
// ─────────────────────────────────────────────

export const postCompleteCheckinSchema = z.object({
  room: z.string().max(20).optional(), // optionnel en Phase 0 : attribution souvent encore manuelle
});

// GET /stays/:stayId/qr-verify?token=...
export const qrVerifyQuerySchema = z.object({
  token: z.string().min(20),
});

// ─────────────────────────────────────────────
// 7. Vue staff — pont vers l'ancien PMS
// ─────────────────────────────────────────────

export const listPendingStaysQuerySchema = z.object({
  status: z.literal("pending_pms_entry").optional(),
});

export const patchPmsSyncStatusSchema = z.object({
  synced: z.literal(true), // on ne permet volontairement pas de "dé-synchroniser"
});

export const policeFormsExportQuerySchema = z.object({
  date: z.string().date(),
});

export const hotelIdParamsSchema = z.object({
  hotelId: z.string().min(1),
});

// PATCH /hotels/:hotelId/service-requests|maintenance-reports|orders/:id/status
export const statusPatchSchema = z.object({
  status: z.enum(["pending", "in_progress", "done", "completed", "cancelled"]),
});

export const requestIdParamsSchema = z.object({
  hotelId: z.string().min(1),
  requestId: z.string().min(1),
});
export const reportIdParamsSchema = z.object({
  hotelId: z.string().min(1),
  reportId: z.string().min(1),
});
export const orderIdParamsSchema = z.object({
  hotelId: z.string().min(1),
  orderId: z.string().min(1),
});

// PATCH /hotels/:hotelId/pms-state — merge superficiel, une ou plusieurs
// sections à la fois (mêmes clés que PMS_STATE_KEYS côté store).
export const pmsStatePatchSchema = z.record(z.string(), z.unknown());

// ─────────────────────────────────────────────
// 8. Gestion des comptes staff (Équipe & Permissions)
// ─────────────────────────────────────────────

const staffRoleSchema = z.enum(["reception", "gm", "housekeeping", "maintenance", "super_admin"]);

export const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: staffRoleSchema,
  name: z.string().min(1).max(80).optional(),
});

export const staffIdParamsSchema = z.object({
  hotelId: z.string().min(1),
  staffId: z.string().min(1),
});

// ─────────────────────────────────────────────
// 8. Commandes post-check-in (room service, spa...) — réglées sur le folio
// via le moyen de paiement déjà capturé au check-in (pas de nouvelle saisie
// carte : on retrouve le pspToken associé au stayId, qui est l'identifiant
// porté par le QR généré à la complétion du check-in).
// ─────────────────────────────────────────────

export const stayIdParamsSchema = z.object({
  stayId: z.string().min(1),
});

// /hotels/:hotelId/stays/:stayId/... (routes staff qui visent un séjour précis)
export const hotelStayIdParamsSchema = z.object({
  hotelId: z.string().min(1),
  stayId: z.string().min(1),
});

// Le client n'envoie plus qu'une RÉFÉRENCE (id + quantité) : name et price
// sont retirés du schéma d'entrée et résolus côté serveur depuis le
// catalogue (même logique que createPaymentIntentSchema ci-dessous, §8bis),
// pour empêcher un client de fixer lui-même son propre prix.
const orderItemRefSchema = z.object({
  id: z.string().min(1).max(100),
  qty: z.coerce.number().int().min(1).max(50),
});

export const postOrderSchema = z.object({
  category: z.enum(["room_service", "spa", "concierge"]).default("room_service"),
  items: z.array(orderItemRefSchema).min(1).max(50),
});

// ─────────────────────────────────────────────
// 8bis. Paiement en ligne (PaymentIntent) — POST /payments/create-intent
//
// Le client n'envoie que des RÉFÉRENCES d'articles + quantités. `price` et
// `name` éventuellement présents dans chaque ligne sont retirés par Zod (objet
// non strict) et de toute façon jamais lus : le prix vient du catalogue
// serveur (services/catalogPricing.ts).
// `amount` est le total AFFICHÉ au client (unités principales, ex. 78 pour
// 78 DT) : il ne sert QU'À détecter un écart avec le total recalculé par le
// serveur (409 price_mismatch) — jamais à fixer le montant débité.
// ─────────────────────────────────────────────

export const createPaymentIntentSchema = z.object({
  stayId: z.string().min(1).max(64),
  category: z.enum(["room_service", "spa"]).default("room_service"),
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        qty: z.coerce.number().int().min(1).max(50),
      })
    )
    .min(1)
    .max(50),
  amount: z.coerce.number().positive().max(1_000_000),
  currency: z
    .string()
    .length(3)
    .transform((c) => c.toLowerCase()),
});

export const stayPaymentParamsSchema = z.object({
  stayId: z.string().min(1),
  paymentId: z.string().min(1).max(64),
});

// ─────────────────────────────────────────────
// 9. Demandes de service, signalements maintenance, notes concierge,
// checkout — toutes rattachées au stayId (voir requireActiveStay).
// ─────────────────────────────────────────────

export const postServiceRequestSchema = z.object({
  req: z.string().min(1).max(200),
  priority: z.enum(["LOW", "MED", "HIGH"]).default("MED"),
  price: z.coerce.number().nonnegative().default(0),
});

export const postMaintenanceReportSchema = z.object({
  issue: z.string().min(1).max(300),
  equipment: z.string().max(150).optional(),
});

export const postNoteSchema = z.object({
  text: z.string().min(1).max(500),
});

// ─────────────────────────────────────────────
// 10. Concierge IA (Phase 1) — message client → réponse IA
// ─────────────────────────────────────────────

export const postConciergeMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  lang: z.enum(["fr", "en", "ar"]).default("fr"),
});

// GET /hotels/:hotelSlug/services?lang=en — traduction à la volée (n°11)
export const publicServicesQuerySchema = z.object({
  lang: z.enum(["fr", "en", "ar"]).default("fr"),
});

// ─────────────────────────────────────────────
// Enfants (utilisé en interne lors de la finalisation, pas exposé tel quel côté API
// mais réutilisable si un endpoint dédié /checkin-sessions/:token/children apparaît)
// ─────────────────────────────────────────────

export const stayChildSchema = z.object({
  name: z.string().min(1).max(100),
  age: z.coerce.number().int().min(0).max(17),
});

export const stayChildrenListSchema = z.array(stayChildSchema).max(10);

// ─────────────────────────────────────────────
// Types TypeScript dérivés (pratique pour typer les handlers Express/Fastify/Nest)
// ─────────────────────────────────────────────

export type StaffLoginInput = z.infer<typeof staffLoginSchema>;
export type GuestDataInput = z.infer<typeof patchGuestDataSchema>;
export type SignatureInput = z.infer<typeof postSignatureSchema>;
export type PaymentMethodInput = z.infer<typeof postPaymentMethodSchema>;
export type CompleteCheckinInput = z.infer<typeof postCompleteCheckinSchema>;
export type StayChildInput = z.infer<typeof stayChildSchema>;
export type PostOrderInput = z.infer<typeof postOrderSchema>;
export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type PostServiceRequestInput = z.infer<typeof postServiceRequestSchema>;
export type PostMaintenanceReportInput = z.infer<typeof postMaintenanceReportSchema>;
export type PostNoteInput = z.infer<typeof postNoteSchema>;
export type PostConciergeMessageInput = z.infer<typeof postConciergeMessageSchema>;

// ─────────────────────────────────────────────
// Exemple d'utilisation dans un handler (Express)
// ─────────────────────────────────────────────
//
// app.patch("/checkin-sessions/:sessionToken/guest-data", (req, res) => {
//   const parseParams = scanIdParamsSchema.safeParse(req.params);
//   const parseBody = patchGuestDataSchema.safeParse(req.body);
//   if (!parseParams.success || !parseBody.success) {
//     return res.status(400).json({
//       error: "validation_error",
//       details: [...(parseParams.error?.issues ?? []), ...(parseBody.error?.issues ?? [])],
//     });
//   }
//   // parseBody.data est maintenant typé et sûr à utiliser
// });
