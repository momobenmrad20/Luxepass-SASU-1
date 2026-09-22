import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { AlertTriangle, Check, Lock } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// StripeCheckoutForm — paiement en ligne (room service / spa) via Stripe
// Elements, alimenté par le `clientSecret` renvoyé par POST
// /payments/create-intent (paymentsApi.createIntent, apiClient.js).
//
// Aucune donnée de carte ne transite par ce frontend au-delà de Stripe.js :
// <PaymentElement/> est un iframe hébergé par Stripe (cartes + Apple Pay /
// Google Pay, cf. `automatic_payment_methods` côté backend,
// services/paymentService.ts).
//
// IMPORTANT — ce que `onSuccess` signifie et ne signifie PAS : il est appelé
// dès que `stripe.confirmPayment()` renvoie un PaymentIntent sans erreur
// CÔTÉ NAVIGATEUR. Ce n'est PAS la preuve que le paiement est encaissé —
// seul le webhook signé (`POST /payments/webhook`) fait foi côté serveur et
// crée réellement la commande (docs/PAYMENTS.md). L'appelant doit donc
// encore attendre que `paymentsApi.getStatus` renvoie `status: "PAID"`
// avant de considérer la commande comme passée (voir l'appel dans
// LuxePass.jsx, `startCardPayment`/`pollPaymentUntilSettled`).
// ─────────────────────────────────────────────────────────────

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";

// Singleton paresseux (comme le client Stripe du backend, paymentService.ts) :
// loadStripe() charge Stripe.js une seule fois, pas à chaque montage du composant.
let stripePromise = null;
function getStripePromise() {
  if (!STRIPE_PUBLISHABLE_KEY) return null;
  stripePromise ??= loadStripe(STRIPE_PUBLISHABLE_KEY);
  return stripePromise;
}

function CheckoutFormInner({ onSuccess, onCancel, submitLabel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return; // Stripe.js/Elements pas encore chargés
    setIsLoading(true);
    setErrorMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      // Pas de redirection hors-site pour une carte/wallet standard ; Stripe
      // ne redirige que si le moyen de paiement l'exige (ex. 3-D Secure).
      redirect: "if_required",
    });

    if (error) {
      // error.type === "card_error" | "validation_error" : message déjà
      // formulé pour un client (ex. "Votre carte a été refusée").
      setErrorMessage(error.message || "Le paiement a été refusé. Veuillez réessayer.");
      setIsLoading(false);
      return;
    }

    setIsSuccess(true);
    setIsLoading(false);
    onSuccess?.(paymentIntent);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />

      {errorMessage && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertTriangle size={12} />{errorMessage}
        </p>
      )}

      <p className="text-[11px] text-white/30 flex items-center gap-1">
        <Lock size={11} /> Paiement sécurisé par Stripe — aucune donnée de carte ne transite par ce serveur.
      </p>

      {isSuccess ? (
        <p className="text-sm text-emerald-400 flex items-center gap-2">
          <Check size={16} /> Paiement confirmé — enregistrement de la commande…
        </p>
      ) : (
        <div className="flex gap-3">
          {onCancel && (
            <button type="button" onClick={onCancel} disabled={isLoading}
              className="flex-1 py-3 rounded-xl text-sm font-semibold border border-white/15 text-white/70 disabled:opacity-40">
              Annuler
            </button>
          )}
          <button type="submit" disabled={!stripe || isLoading}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-black disabled:opacity-40 transition-opacity"
            style={{ background: "linear-gradient(135deg, #D4AF37, #B8961E)" }}>
            {isLoading ? "Traitement..." : submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}

// `clientSecret` : requis, renvoyé par POST /payments/create-intent.
// `onSuccess(paymentIntent)` / `onCancel()` : callbacks de l'appelant.
export default function StripeCheckoutForm({ clientSecret, onSuccess, onCancel, submitLabel = "Payer maintenant" }) {
  const promise = getStripePromise();

  if (!promise) {
    return (
      <p className="text-xs text-red-400 flex items-center gap-1">
        <AlertTriangle size={12} />
        Paiement en ligne indisponible (VITE_STRIPE_PUBLISHABLE_KEY absente côté frontend).
      </p>
    );
  }
  if (!clientSecret) return null;

  return (
    <Elements
      stripe={promise}
      options={{
        clientSecret,
        appearance: { theme: "night", variables: { colorPrimary: "#D4AF37", borderRadius: "12px" } },
      }}
    >
      <CheckoutFormInner onSuccess={onSuccess} onCancel={onCancel} submitLabel={submitLabel} />
    </Elements>
  );
}
