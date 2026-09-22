// @ts-check
import { useEffect, useState } from "react";
import { checkinApi, ordersApi, setClientStay, ApiError } from "../api/apiClient";
import { encodeQrPayload } from "../api/qrPayload";
import { CONCIERGE_PACKAGE, computeConciergePrice, detectCardBrand, normalizeDate, normalizeGender } from "../utils/checkin";
import { useAppState } from "./useAppState";

/**
 * Parcours de check-in en 3 écrans / 6 étapes côté API : session, scan de la pièce
 * d'identité (OCR), données invité, signature, moyen de paiement + finalisation
 * (QR, stayToken, forfait conciergerie, écritures PMS locales).
 *
 * Extrait tel quel de CheckInFlow — même logique, mêmes noms. Le hook ne rend
 * rien et ne touche pas au DOM (la référence du champ fichier, fileRef, reste
 * dans le composant). Fonctions pures dans utils/checkin.js.
 *
 * @param {{ hotel: import("../types").Hotel }} args
 * @returns {import("../types").UseCheckInValue}
 */
export function useCheckIn({ hotel }) {
  const { setAppState } = useAppState();
  const [step, setStep] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [guestData, setGuestData] = useState({
    firstName: "", lastName: "", age: "", gender: "", idNumber: "",
    profession: "", from: "", destination: "", arrival: "", departure: "", occupants: 1,
  });
  const [scanned, setScanned] = useState(false);
  const [signature, setSignature] = useState(null);
  const [card, setCard] = useState({ number: "", holder: "", expiry: "", cvv: "" });
  const [qrPayload, setQrPayload] = useState(null); // texte encodé dans le QR (stayId + qrToken HMAC)
  // Forfait Conciergerie & Bien-être — activé par défaut mais visible/décochable
  const [conciergeOptIn, setConciergeOptIn] = useState(true);
  const [conciergeAdded, setConciergeAdded] = useState(null);

  // ── Session de check-in côté backend ──
  // sessionToken identifie ce parcours auprès de l'API (voir apiClient.js).
  // Rien n'est envoyé au serveur avant d'avoir ce token.
  const [sessionToken, setSessionToken] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [initError, setInitError] = useState(null);

  // Erreurs / états de soumission par étape, affichés inline sous chaque bouton
  const [scanError, setScanError] = useState(null);
  const [guestDataError, setGuestDataError] = useState(null);
  const [signatureError, setSignatureError] = useState(null);
  const [paymentError, setPaymentError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [stayId, setStayId] = useState(null);
  const [room, setRoom] = useState(null);

  // Démarre la session dès l'arrivée sur l'écran de check-in.
  // hotel.id doit correspondre au "hotelSlug" attendu par le backend
  // (minuscules/chiffres/tirets) — c'est déjà le cas pour "oceana"/"magic".
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setInitializing(true);
      setInitError(null);
      try {
        const res = await checkinApi.start(hotel.id);
        if (!cancelled) setSessionToken(res.sessionToken);
      } catch (err) {
        if (!cancelled) {
          setInitError(
            err instanceof ApiError
              ? err.message
              : "Impossible de contacter le serveur. Vérifiez votre connexion."
          );
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hotel.id]);

  // Étape 0 — envoi du document scanné à l'API OCR
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !sessionToken) return;
    setScanning(true);
    setScanError(null);
    try {
      const res = await checkinApi.scanId(sessionToken, file);
      // Le backend ne pré-remplit que ce qu'il a pu extraire ; les champs
      // vides restent à saisir manuellement par le client avant validation.
      setGuestData(prev => ({ ...prev, ...res.extracted }));
      setScanned(true);
    } catch (err) {
      setScanError(err instanceof ApiError ? err.message : "Échec de l'analyse du document");
    } finally {
      setScanning(false);
    }
  };

  // Étape 0 → 1 — confirme/valide les données invité côté serveur (Zod)
  const handleConfirmGuestData = async () => {
    if (!sessionToken) return;
    setGuestDataError(null);
    setSubmitting(true);
    try {
      await checkinApi.patchGuestData(sessionToken, {
        ...guestData,
        age: Number(guestData.age),
        gender: normalizeGender(guestData.gender),
        arrival: normalizeDate(guestData.arrival),
        departure: normalizeDate(guestData.departure),
      });
      setStep(1);
    } catch (err) {
      setGuestDataError(
        err instanceof ApiError
          ? err.details
            ? err.details.map(d => d.message).join(" · ")
            : err.message
          : "Erreur réseau, veuillez réessayer"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Étape 1 → 2 — enregistre la signature côté serveur
  const handleConfirmSignature = async () => {
    if (!sessionToken || !signature) return;
    setSignatureError(null);
    setSubmitting(true);
    try {
      await checkinApi.postSignature(sessionToken, signature);
      setStep(2);
    } catch (err) {
      setSignatureError(err instanceof ApiError ? err.message : "Erreur réseau, veuillez réessayer");
    } finally {
      setSubmitting(false);
    }
  };

  // Étape 2 — moyen de paiement + finalisation
  const generateQR = async () => {
    if (!sessionToken) return;
    setPaymentError(null);
    setSubmitting(true);
    try {
      // ⚠️ PLACEHOLDER — ceci n'est PAS une intégration PSP réelle.
      // En production, remplacer ce bloc par la tokenisation via un vrai
      // fournisseur (ex: Stripe Elements/PaymentIntent) et n'utiliser que
      // le token qu'il retourne. Le PAN et le CVV ne doivent JAMAIS
      // transiter vers notre propre backend (cf. postPaymentMethodSchema
      // qui n'accepte que pspToken/last4/brand).
      const last4 = card.number.replace(/\s/g, "").slice(-4);
      const brand = detectCardBrand(card.number);
      const pspToken = `dev_placeholder_${Date.now()}`;

      await checkinApi.postPaymentMethod(sessionToken, { pspToken, last4, brand });
      const result = await checkinApi.complete(sessionToken, undefined);

      // Le QR porte le stayId ET le qrToken HMAC renvoyé par l'étape 6 :
      // c'est ce jeton que GET /stays/:stayId/qr-verify contrôle.
      if (!result.qrToken) console.warn("complete() n'a pas renvoyé de qrToken : QR non vérifiable");
      const payload = encodeQrPayload({ stayId: result.stayId, qrToken: result.qrToken });

      setStayId(result.stayId);
      setRoom(result.room);
      setQrPayload(payload);

      // Persistance du séjour (P1 §2.1) : permet de restaurer le Client
      // Dashboard sans repasser par le check-in si l'onglet est rechargé
      // ou rouvert — cf. la restauration au montage de LuxePassApp.
      // PHASE 0 / ACTION 1 : le stayToken signé (émis à l'étape 6) est la seule
      // preuve d'accès aux routes /stays/:stayId/* — sans lui, plus de concierge,
      // commandes, notes ni checkout. Il est stocké AVANT les appels ci-dessous
      // (forfait conciergerie) car ceux-ci l'exigent déjà. Jamais dans le QR.
      if (!result.stayToken) console.warn("complete() n'a pas renvoyé de stayToken : les routes /stays/* seront refusées");
      setClientStay({ stayId: result.stayId, qrToken: result.qrToken, hotelId: hotel.id, stayToken: result.stayToken });

      // Forfait Conciergerie & Bien-être — si toujours coché à ce stade,
      // on l'ajoute comme une vraie commande facturée (visible telle
      // quelle sur le folio, avec son propre nom de ligne).
      if (conciergeOptIn) {
        try {
          const { total } = computeConciergePrice(guestData.arrival, guestData.departure, guestData.occupants);
          await ordersApi.create(result.stayId, [{ id: CONCIERGE_PACKAGE.id, name: CONCIERGE_PACKAGE.name, price: total, qty: 1 }], "concierge");
          setConciergeAdded(total);
        } catch {
          // Non-bloquant : le check-in est déjà finalisé, on ne casse pas
          // le parcours pour un forfait optionnel qui a échoué à s'ajouter.
        }
      }

      // ── Bookkeeping local pour les vues PMS/Admin de la démo ──
      // Ces onglets (PMS, Super Admin) ne sont pas encore branchés sur le
      // backend ; on garde cette mise à jour d'appState pour qu'ils
      // continuent de fonctionner en attendant leur migration.
      // `guest.stayToken` : copie dans le state React (accès direct depuis l'UI) ;
      // la source pour les requêtes reste apiClient (localStorage
      // `luxepass_stay_token`). NE JAMAIS recopier le token dans pmsGuests /
      // policeForms ni dans une clé de PMS_STATE_KEYS : ces sections sont
      // synchronisées avec le backend et visibles du staff.
      const guestId = `g_${Date.now()}`;
      setAppState(prev => ({
        ...prev,
        guest: { ...guestData, hotel, stayId: result.stayId, qrToken: result.qrToken, stayToken: result.stayToken, qrPayload: payload, signature, card: { ...card, cvv: "***" }, guestId, room: result.room },
        pmsGuests: [
          { id: guestId, name: `${guestData.firstName} ${guestData.lastName}`, room: result.room, status: "AI Validé", arrival: "Arrivée ce soir", nationality: "🌍", checkedIn: false },
          ...prev.pmsGuests,
        ],
        policeForms: [
          {
            id: `pf_${Date.now()}`,
            guestId,
            firstName: guestData.firstName,
            lastName: guestData.lastName,
            age: guestData.age,
            gender: guestData.gender,
            idNumber: guestData.idNumber,
            profession: guestData.profession,
            from: guestData.from,
            destination: guestData.destination,
            arrival: guestData.arrival,
            departure: guestData.departure,
            room: result.room,
            hasSignature: !!signature,
            hasIdDocument: true,
            submittedAt: new Date().toISOString(),
          },
          ...(prev.policeForms || []),
        ],
      }));
    } catch (err) {
      setPaymentError(err instanceof ApiError ? err.message : "Erreur réseau, veuillez réessayer");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    step, setStep,
    initializing, initError,
    scanning, scanned, scanError, handleFileSelected,
    guestData, setGuestData, guestDataError, handleConfirmGuestData,
    signature, setSignature, signatureError, handleConfirmSignature,
    card, setCard, conciergeOptIn, setConciergeOptIn, conciergeAdded,
    qrPayload, stayId, room, paymentError, generateQR,
    submitting,
  };
}
