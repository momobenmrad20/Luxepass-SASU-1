// @ts-check
import { useCallback, useEffect, useState } from "react";
import { ApiError, ordersApi, paymentsApi } from "../api/apiClient";
import { useAppState } from "./useAppState";

/**
 * Commandes du séjour côté client : panier, commande directe (facturée sur le
 * moyen de paiement du check-in), paiement carte Stripe (création de l'intention
 * puis interrogation du statut jusqu'à PAID/FAILED), toast de confirmation,
 * modale « payer via QR » et folio.
 *
 * Extrait tel quel de ClientDashboard — même logique, mêmes noms. À appeler UNE
 * fois, dans ClientDashboard : le panier survit aux changements d'onglet et sert
 * aux deux catalogues (menu / spa) ; `activeTab` sert à choisir la catégorie
 * ("spa" sinon "room_service"). Le total est recalculé côté serveur pour le
 * paiement carte : seul {id, qty} est envoyé (voir docs/PAYMENTS.md).
 *
 * @param {{ guest: import("../types").Guest, hotel: import("../types").Hotel, room: string, activeTab: string }} args
 * @returns {import("../types").UseOrdersValue}
 */
export function useOrders({ guest, hotel, room, activeTab }) {
  const { setAppState } = useAppState();
  const guestId = guest?.guestId;
  const [cart, setCart] = useState([]);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [qrPayModal, setQrPayModal] = useState(false);
  // ── Commande réelle côté backend (facturée sur le paiement du check-in) ──
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState(null);
  // ── Paiement en ligne (Stripe PaymentIntents, room service / spa) ──
  // Remplace l'ancien flux qui appelait ordersApi.create directement avec un
  // prix côté client (POST /payments/create-intent recalcule le total côté
  // serveur depuis le catalogue — docs/PAYMENTS.md). La commande n'est créée
  // qu'après webhook Stripe : on affiche le formulaire de carte, puis on
  // interroge le statut du paiement jusqu'à PAID/FAILED.
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState(null);
  const [paymentIdInFlight, setPaymentIdInFlight] = useState(null);
  const [paymentInitLoading, setPaymentInitLoading] = useState(false);
  const [paymentInitError, setPaymentInitError] = useState(null);
  const [paymentSettling, setPaymentSettling] = useState(false);
  const [paymentSettleError, setPaymentSettleError] = useState(null);
  // ── Folio (historique des commandes) — lu depuis le backend ──
  const [folio, setFolio] = useState({ orders: [], folioTotal: 0 });
  const refreshFolio = useCallback(() => {
    if (!guest?.stayId) return;
    ordersApi.list(guest.stayId).then(setFolio).catch(() => {});
  }, [guest?.stayId]);

  useEffect(() => { refreshFolio(); }, [refreshFolio]);

  // Événements temps réel poussés vers le PMS + backend réel
  const pushOrder = (items, total) => setAppState(prev => ({
    ...prev,
    liveOrders: [{ id: `lo_${Date.now()}`, guestId, guest: `${guest?.firstName} ${guest?.lastName}`, room, items, total, time: "À l'instant", status: "En préparation" }, ...(prev.liveOrders || [])],
    folios: { ...prev.folios, [guestId]: (prev.folios?.[guestId] || 0) + total },
  }));

  const addToCart = (item) => setCart(p => {
    const ex = p.find(c => c.id === item.id);
    if (ex) return p.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
    return [...p, { ...item, qty: 1 }];
  });
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // La confirmation de commande existait déjà comme état (orderPlaced) mais
  // n'était affichée nulle part — ce toast auto-masqué comble ce trou.
  useEffect(() => {
    if (!orderPlaced) return;
    const timer = setTimeout(() => setOrderPlaced(false), 8000);
    return () => clearTimeout(timer);
  }, [orderPlaced]);

  // Envoie la commande au backend réel — facturée via le moyen de paiement
  // déjà capturé au check-in, identifié par guest.stayId (l'identifiant du
  // séjour, aussi encodé dans le QR du client). N'appelle jamais une nouvelle saisie carte.
  const handleConfirmOrder = async () => {
    if (!guest?.stayId || cart.length === 0) return;
    setOrderSubmitting(true);
    setOrderError(null);
    try {
      const category = activeTab === "spa" ? "spa" : "room_service";
      await ordersApi.create(
        guest.stayId,
        cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
        category
      );
      pushOrder(cart.map(c => `${c.name} x${c.qty}`), cartTotal); // synchro affichage PMS (module non branché au backend)
      setQrPayModal(false);
      setCart([]);
      setOrderPlaced(true);
      refreshFolio();
    } catch (err) {
      setOrderError(
        err instanceof ApiError ? err.message : "Erreur réseau, veuillez réessayer"
      );
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Ouvre le paiement carte : crée l'intention (prix recalculé côté
  // serveur — le panier n'envoie jamais {price}, seulement {id, qty}) et
  // affiche le formulaire Stripe une fois le clientSecret reçu.
  const startCardPayment = async () => {
    if (!guest?.stayId || cart.length === 0) return;
    setPaymentInitLoading(true);
    setPaymentInitError(null);
    try {
      const category = activeTab === "spa" ? "spa" : "room_service";
      const result = await paymentsApi.createIntent(guest.stayId, {
        category,
        items: cart.map(c => ({ id: c.id, qty: c.qty })),
        amount: cartTotal,
        currency: (hotel?.currency || "TND").toLowerCase(),
      });
      setPaymentIdInFlight(result.paymentId);
      setPaymentClientSecret(result.clientSecret);
      setPaymentSettleError(null);
      setPaymentModal(true);
    } catch (err) {
      setPaymentInitError(err instanceof ApiError ? err.message : "Erreur réseau, veuillez réessayer");
    } finally {
      setPaymentInitLoading(false);
    }
  };

  const closePaymentModal = () => {
    setPaymentModal(false);
    setPaymentClientSecret(null);
    setPaymentIdInFlight(null);
    setPaymentSettling(false);
    setPaymentSettleError(null);
  };

  // stripe.confirmPayment() a réussi CÔTÉ NAVIGATEUR — ça ne prouve pas
  // l'encaissement (seul le webhook Stripe fait foi). On interroge le statut
  // jusqu'à PAID (commande créée par le backend) ou FAILED, avec un nombre
  // de tentatives borné : le webhook est normalement quasi immédiat, mais
  // reste asynchrone.
  const pollPaymentUntilSettled = async (paymentId) => {
    if (!guest?.stayId || !paymentId) return;
    setPaymentSettling(true);
    setPaymentSettleError(null);
    const delays = [1000, 1500, 2000, 2000, 3000, 3000]; // ~12,5 s au total
    try {
      for (const delay of delays) {
        await new Promise(r => setTimeout(r, delay));
        const status = await paymentsApi.getStatus(guest.stayId, paymentId);
        if (status.status === "PAID") {
          pushOrder(cart.map(c => `${c.name} x${c.qty}`), cartTotal); // synchro affichage PMS (module non branché au backend)
          setCart([]);
          setOrderPlaced(true);
          refreshFolio();
          closePaymentModal();
          return;
        }
        if (status.status === "FAILED") {
          setPaymentSettleError("Le paiement a échoué. Vérifiez votre moyen de paiement ou réessayez.");
          setPaymentSettling(false);
          return;
        }
        // PENDING : le webhook n'est pas encore arrivé, on continue à interroger.
      }
      setPaymentSettleError(
        "Paiement en cours de confirmation — cela peut prendre quelques instants. " +
        "Vérifiez votre commande dans quelques secondes avant de réessayer."
      );
    } catch {
      setPaymentSettleError("Impossible de vérifier le statut du paiement. Vérifiez votre connexion.");
    } finally {
      setPaymentSettling(false);
    }
  };

  return {
    cart, addToCart, cartTotal,
    orderPlaced, setOrderPlaced,
    qrPayModal, setQrPayModal,
    orderSubmitting, orderError, handleConfirmOrder,
    paymentModal, paymentClientSecret, paymentIdInFlight,
    paymentInitLoading, paymentInitError, paymentSettling, paymentSettleError,
    startCardPayment, closePaymentModal, pollPaymentUntilSettled,
    folio, refreshFolio,
  };
}
