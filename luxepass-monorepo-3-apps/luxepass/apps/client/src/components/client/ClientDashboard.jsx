import { useState } from "react";
import { AlertTriangle, Baby, Bed, Bell, Calendar, Car, Check, ChevronLeft, Dumbbell, Home, LogOut, MapPin, MessageSquare, QrCode, RefreshCw, Ship, Sparkles, Star, Utensils, Wrench, X } from "lucide-react";
import { ApiError, stayApi } from "@shared/api/apiClient";
import { gold, hexToRgba, handleImgError } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldBadge from "@shared/components/common/GoldBadge";
import GoldButton from "@shared/components/common/GoldButton";
import Modal from "@shared/components/common/Modal";
import { EVENTS_CATALOG, OCEANA_GALLERY, ROOMS_STATUS } from "@shared/constants";
import { QRCodeDisplay } from "../pass/DigitalPass";
import MenuCatalog from "../services/MenuCatalog";
import SpaCatalog from "../services/SpaCatalog";
import HousekeepingRequests from "../housekeeping/HousekeepingRequests";
import MaintenanceReport from "../housekeeping/MaintenanceReport";
import StripeCheckoutForm from "../../StripeCheckoutForm";
import ButlerRecommendation from "./ButlerRecommendation";
import ConciergeChat from "./ConciergeChat";
import ProactiveAlerts from "./ProactiveAlerts";
import { useAppState } from "@shared/hooks/useAppState";
import { useI18n } from "@shared/hooks/useI18n";
import { useServiceRequests } from "@shared/hooks/useServiceRequests";
import { useConciergeMemory } from "@shared/hooks/useConcierge";
import { useOrders } from "@shared/hooks/useOrders";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// CLIENT DASHBOARD
// ─────────────────────────────────────────────────────────────
export default function ClientDashboard({ guest, hotel, onLeaveStay }) {
  const { t, lang } = useI18n();
  const { appState, setAppState } = useAppState();
  const [activeTab, setActiveTab] = useState("home");
  const [modal, setModal] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [checkedOut, setCheckedOut] = useState(false);
  const guestId = guest?.guestId;
  const room = guest?.room || (guest?.hotel?.id === "oceana" ? "501" : "312");

  // Demandes du séjour (suivi + envoi de tickets) — voir hooks/useServiceRequests.js
  const {
    myRequests, pushTicket, pushMaintenance,
    actionError, setActionError, actionSubmitting, setActionSubmitting,
  } = useServiceRequests({ guest, room });

  // Mémoire IA partagée avec le PMS (Guest 360) — voir hooks/useConcierge.js
  const { memory, addMemoryNote, clearMemory } = useConciergeMemory({ guest });

  // Panier, commandes et paiement carte — voir hooks/useOrders.js
  const {
    cart, addToCart, cartTotal,
    orderPlaced, setOrderPlaced,
    qrPayModal, setQrPayModal,
    orderSubmitting, orderError, handleConfirmOrder,
    paymentModal, paymentClientSecret, paymentIdInFlight,
    paymentInitLoading, paymentInitError, paymentSettling, paymentSettleError,
    startCardPayment, closePaymentModal, pollPaymentUntilSettled,
  } = useOrders({ guest, hotel, room, activeTab });

  const doCheckout = async () => {
    setAppState(prev => ({
      ...prev,
      rooms: (prev.rooms || ROOMS_STATUS).map(r => r.id === room ? { ...r, status: "cleaning" } : r),
      pmsGuests: (prev.pmsGuests || []).map(g => g.id === guestId ? { ...g, status: "Check-out" } : g),
    }));
    if (!guest?.stayId) return true;
    setActionSubmitting(true);
    setActionError(null);
    try {
      await stayApi.checkout(guest.stayId);
      // Le séjour est clos côté serveur : on efface la clé de restauration
      // locale (P1 §2.1) pour qu'un rechargement de page ne tente plus de
      // ramener ce client sur un dashboard dont le stay est terminé.
      onLeaveStay?.();
      return true;
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Erreur réseau, veuillez réessayer");
      return false;
    } finally {
      setActionSubmitting(false);
    }
  };

  const services = [
    { key: "restaurant", icon: Utensils, label: t.restaurant, tab: "menu", image: OCEANA_GALLERY["Restaurants & Bars"][0] },
    { key: "spa", icon: Sparkles, label: t.spa, tab: "spa", image: OCEANA_GALLERY["Spa & Bien-Être"][0] },
    { key: "tennis", icon: Dumbbell, label: t.tennis, tab: null, image: OCEANA_GALLERY["Hôtel & Espaces"][0] },
    { key: "golf", icon: Star, label: t.golf, tab: null, image: OCEANA_GALLERY["Hôtel & Espaces"][1] },
    { key: "yacht", icon: Ship, label: t.yacht, tab: null, image: OCEANA_GALLERY["Piscines & Plage"][0] },
    { key: "babysitting", icon: Baby, label: t.babysitting, tab: null, image: OCEANA_GALLERY["Chambres"][0] },
    { key: "supercar", icon: Car, label: t.supercar, tab: null, image: OCEANA_GALLERY["Hôtel & Espaces"][2] },
    { key: "taxi", icon: MapPin, label: t.taxi, tab: null, image: OCEANA_GALLERY["Hôtel & Espaces"][3] },
    { key: "events", icon: Calendar, label: t.events, tab: null, image: OCEANA_GALLERY["Restaurants & Bars"][1] },
  ];

  const accent = hotel?.accent || gold;

  return (
    <div className="min-h-screen" style={{ background: "#080808" }}>
      {/* Toast de confirmation de commande — visible depuis n'importe quel onglet */}
      {orderPlaced && (
        <div className="fixed top-4 left-4 right-4 z-50 flex justify-center">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg" style={{ background: "rgba(16,20,18,0.97)", border: "1px solid rgba(52,211,153,0.4)" }}>
            <Check size={16} className="text-emerald-400 flex-shrink-0" />
            <p className="text-white text-sm font-medium">Commande envoyée — l'équipe s'en occupe.</p>
            <button onClick={() => setOrderPlaced(false)} className="ml-1 text-white/40">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Hotel branding banner — image, logo, and accent color of the checked-in property */}
      <div className="relative h-32 overflow-hidden">
        <img src={hotel?.image} alt={hotel?.name} className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" onError={handleImgError} />
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(8,8,8,0.35) 0%, rgba(8,8,8,0.75) 70%, #080808 100%)` }} />
        <div className="relative h-full px-4 flex items-end pb-3 gap-3">
          {hotel?.logo && (
            <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg" style={{ background: "#fff" }}>
              <img src={hotel.logo} alt={`${hotel.name} logo`} className="w-11 h-11 object-contain" referrerPolicy="no-referrer" onError={handleImgError} />
            </div>
          )}
          <div className="pb-0.5">
            <p className="text-white font-bold leading-tight drop-shadow" style={{ fontFamily: "'Georgia', serif" }}>{hotel?.name}</p>
            <p className="text-xs" style={{ color: accent }}>{hotel?.location}</p>
          </div>
        </div>
      </div>

      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b px-4 py-3 flex items-center justify-between" style={{ background: "rgba(8,8,8,0.9)", backdropFilter: "blur(20px)", borderColor: hexToRgba(accent, 0.15) }}>
        <div>
          <p className="text-xs text-white/40">{t.welcome},</p>
          <p className="text-white font-bold">{guest?.firstName} {guest?.lastName}</p>
        </div>
        <div className="flex items-center gap-2">
          {guest?.stayId && (
            <button onClick={() => setQrPayModal(true)} className="p-2 rounded-xl transition-colors" style={{ background: hexToRgba(accent, 0.1), color: accent }}>
              <QrCode size={18} />
            </button>
          )}
          <GoldBadge><Bed size={12} />{t.room} {room}</GoldBadge>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {["home", "concierge", "menu", "spa", "roomservice", "maintenance"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={activeTab === tab ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)" }}>
            {tab === "home" ? <Home size={14} className="inline mr-1" /> : tab === "concierge" ? <MessageSquare size={14} className="inline mr-1" /> : tab === "menu" ? <Utensils size={14} className="inline mr-1" /> : tab === "spa" ? <Sparkles size={14} className="inline mr-1" /> : tab === "roomservice" ? <Bell size={14} className="inline mr-1" /> : <Wrench size={14} className="inline mr-1" />}
            {tab === "home" ? t.dashboard : tab === "concierge" ? t.concierge : tab === "menu" ? t.menu : tab === "spa" ? t.spa : tab === "roomservice" ? t.roomService : t.maintenance}
          </button>
        ))}
      </div>

      <div className="px-4 pb-24 space-y-5">
        {/* HOME TAB */}
        {activeTab === "home" && (
          <>
            <ProactiveAlerts />
            <ButlerRecommendation guest={guest} />
            <div>
              <h3 className="text-white font-semibold mb-3">{t.services}</h3>
              <div className="grid grid-cols-3 gap-3">
                {services.map(({ key, icon: Icon, label, tab, image }) => (
                  <GlassCard key={key} onClick={() => tab ? setActiveTab(tab) : setModal(key)} className="p-0 overflow-hidden flex flex-col items-center text-center">
                    <div className="relative w-full h-16">
                      <img src={image} alt={label} className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" onError={handleImgError} />
                      <div className="absolute inset-0" style={{ background: "rgba(8,8,8,0.35)" }} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(8,8,8,0.55)", backdropFilter: "blur(4px)" }}>
                          <Icon size={16} style={{ color: gold }} />
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-white/70 py-2 px-1">{label}</span>
                  </GlassCard>
                ))}
              </div>
            </div>
            {/* Suivi de mes demandes — lu et rafraîchi depuis le backend
                (le staff change le statut côté PMS, on le relit ici toutes
                les 8s pour un suivi quasi temps réel). */}
            {(myRequests.requests.length > 0 || myRequests.reports.length > 0) && (
              <div className="mb-4">
                <h4 className="text-white/50 text-xs uppercase tracking-wider mb-2">Mes demandes</h4>
                <div className="space-y-2">
                  {[...myRequests.requests.map(r => ({ ...r, kind: "request", label: r.req })),
                    ...myRequests.reports.map(r => ({ ...r, kind: "report", label: r.issue, status: r.status }))]
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map(item => {
                      const statusMap = {
                        pending: { label: "En attente", color: "#D4AF37" },
                        in_progress: { label: "En cours", color: "#60A5FA" },
                        done: { label: "Résolu", color: "#34D399" },
                      };
                      const s = statusMap[item.status] || statusMap.pending;
                      return (
                        <GlassCard key={item.id} className="p-3 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-white text-sm truncate">{item.label}</p>
                            {item.kind === "report" && item.ticket && (
                              <p className="text-white/30 text-[10px]">{item.ticket}</p>
                            )}
                          </div>
                          <span className="text-[10px] px-2 py-1 rounded-full flex-shrink-0" style={{ background: `${s.color}22`, color: s.color }}>
                            {s.label}
                          </span>
                        </GlassCard>
                      );
                    })}
                </div>
              </div>
            )}

            {checkedOut ? (
              <GlassCard className="p-4 text-center" style={{ borderColor: "rgba(16,185,129,0.3)" }}>
                <Check size={18} className="mx-auto mb-1 text-emerald-400" />
                <p className="text-emerald-400 text-sm font-medium">Check-out transmis — chambre {room} signalée au ménage.</p>
              </GlassCard>
            ) : (
              <>
                {actionError && (
                  <p className="text-xs text-red-400 mb-2 flex items-center gap-1 justify-center">
                    <AlertTriangle size={12} />{actionError}
                  </p>
                )}
                <GoldButton variant="ghost" className="w-full" disabled={actionSubmitting} onClick={async () => { const ok = await doCheckout(); if (ok) setCheckedOut(true); }}>
                  <LogOut size={14} /> {actionSubmitting ? "Envoi..." : "Terminer mon séjour"}
                </GoldButton>
              </>
            )}
          </>
        )}

        {/* CONCIERGE TAB — modules 1, 2, 4, 5, 6 */}
        {activeTab === "concierge" && (
          <ConciergeChat guest={guest} hotel={hotel} memory={memory} onMemoryNote={addMemoryNote} pushTicket={pushTicket} onClearMemory={clearMemory} />
        )}

        {/* MENU TAB */}
        {activeTab === "menu" && (
          <MenuCatalog hotel={hotel} cart={cart} addToCart={addToCart} cartTotal={cartTotal} startCardPayment={startCardPayment} paymentInitLoading={paymentInitLoading} paymentInitError={paymentInitError} />
        )}

        {/* SPA TAB */}
        {activeTab === "spa" && (
          <SpaCatalog hotel={hotel} cart={cart} addToCart={addToCart} cartTotal={cartTotal} startCardPayment={startCardPayment} paymentInitLoading={paymentInitLoading} paymentInitError={paymentInitError} />
        )}

        {/* ROOM SERVICE */}
        {activeTab === "roomservice" && (
          <HousekeepingRequests hotel={hotel} guestId={guestId} setModal={setModal} pushTicket={pushTicket} />
        )}

        {/* MAINTENANCE — version accessible, pensée pour une prise en main facile (y compris clients âgés) */}
        {activeTab === "maintenance" && (
          <MaintenanceReport room={room} pushMaintenance={pushMaintenance} />
        )}
      </div>

      {/* QR Pay Modal */}
      <Modal open={qrPayModal} onClose={() => setQrPayModal(false)} title={t.payQR}>
        <QRCodeDisplay value={guest?.qrPayload || "DEMO-TOKEN"} caption={guest?.stayId ? `#${guest.stayId.slice(-6)}` : undefined} />
        <p className="text-center text-xs text-white/40 mt-4">Présentez ce QR code au personnel ou au terminal de paiement.</p>
        {orderError && (
          <p className="text-xs text-red-400 mt-3 flex items-center gap-1 justify-center">
            <AlertTriangle size={12} />{orderError}
          </p>
        )}
        <GoldButton className="w-full mt-4" onClick={handleConfirmOrder} disabled={orderSubmitting}>
          <Check size={16} /> {orderSubmitting ? "Envoi..." : t.confirm}
        </GoldButton>
      </Modal>

      {/* Stripe Card Payment Modal — room service / spa (docs/PAYMENTS.md) */}
      <Modal open={paymentModal} onClose={paymentSettling ? undefined : closePaymentModal} title="Paiement par carte">
        <p className="text-sm text-white/50 mb-4">
          {cart.reduce((s, i) => s + i.qty, 0)} article(s) — <span style={{ color: gold }}>{cartTotal} {hotel?.currencySymbol}</span>
        </p>
        {paymentSettling ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <RefreshCw size={22} className="animate-spin" style={{ color: gold }} />
            <p className="text-sm text-white/60 text-center">Confirmation du paiement en cours…</p>
          </div>
        ) : paymentClientSecret ? (
          <StripeCheckoutForm
            clientSecret={paymentClientSecret}
            onCancel={closePaymentModal}
            onSuccess={() => pollPaymentUntilSettled(paymentIdInFlight)}
          />
        ) : null}
        {paymentSettleError && (
          <p className="text-xs text-red-400 mt-3 flex items-center gap-1">
            <AlertTriangle size={12} />{paymentSettleError}
          </p>
        )}
      </Modal>

      {/* Service Modal */}
      <Modal open={!!modal && !modal.startsWith("requested_")} onClose={() => { setModal(null); setSelectedEvent(null); }}
        title={services.find(s => s.key === modal)?.label || ""}>
        {modal === "events" ? (
          <>
            {!selectedEvent ? (
              <div className="space-y-2 max-h-96 overflow-y-auto -mx-1 px-1">
                {EVENTS_CATALOG.map(ev => (
                  <GlassCard key={ev.id} onClick={() => setSelectedEvent(ev)} className="p-2.5 flex items-center gap-3">
                    <img src={ev.image} alt={ev.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" referrerPolicy="no-referrer" onError={handleImgError} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">{ev.name}</p>
                      <p className="text-white/40 text-xs mt-0.5">{ev.desc}</p>
                    </div>
                    <span className="text-sm font-bold flex-shrink-0" style={{ color: gold }}>{ev.price} {hotel.currencySymbol}</span>
                  </GlassCard>
                ))}
              </div>
            ) : (
              <>
                <button onClick={() => setSelectedEvent(null)} className="flex items-center gap-1 text-xs text-white/40 mb-3">
                  <ChevronLeft size={14} /> Retour aux expériences
                </button>
                <div className="flex items-center gap-3 mb-4">
                  <img src={selectedEvent.image} alt={selectedEvent.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" referrerPolicy="no-referrer" onError={handleImgError} />
                  <div>
                    <p className="text-white font-semibold text-sm">{selectedEvent.name}</p>
                    <p className="text-xs" style={{ color: gold }}>{selectedEvent.price} {hotel.currencySymbol}</p>
                  </div>
                </div>
                <p className="text-white/60 text-sm mb-4">Réservation disponible 24h/24 — Notre équipe confirme sous 15 minutes.</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-white/40 block mb-1">Date souhaitée</label>
                    <input type="date" className="w-full bg-white/5 border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
                      style={{ borderColor: "rgba(212,175,55,0.2)" }} defaultValue={guest?.arrival} />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 block mb-1">Nombre de personnes</label>
                    <input type="number" className="w-full bg-white/5 border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
                      style={{ borderColor: "rgba(212,175,55,0.2)" }} defaultValue={2} min={1} />
                  </div>
                </div>
                <GoldButton className="w-full mt-4" onClick={() => { pushTicket(selectedEvent.name, "MED"); setModal(null); setSelectedEvent(null); }}>
                  <Check size={16} /> {t.confirm}
                </GoldButton>
              </>
            )}
          </>
        ) : (
          <>
            <p className="text-white/60 text-sm mb-4">Réservation disponible 24h/24 — Notre équipe confirme sous 15 minutes.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/40 block mb-1">Date souhaitée</label>
                <input type="date" className="w-full bg-white/5 border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
                  style={{ borderColor: "rgba(212,175,55,0.2)" }} defaultValue={guest?.arrival} />
              </div>
              <div>
                <label className="text-xs text-white/40 block mb-1">Nombre de personnes</label>
                <input type="number" className="w-full bg-white/5 border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
                  style={{ borderColor: "rgba(212,175,55,0.2)" }} defaultValue={2} min={1} />
              </div>
            </div>
            <GoldButton className="w-full mt-4" onClick={() => setModal(null)}>
              <Check size={16} /> {t.confirm}
            </GoldButton>
          </>
        )}
      </Modal>

      {/* Request confirmation */}
      <Modal open={modal?.startsWith("requested_")} onClose={() => setModal(null)} title="Demande envoyée">
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: "rgba(212,175,55,0.15)" }}>
            <Check size={28} style={{ color: gold }} />
          </div>
          <p className="text-white">Votre demande a été transmise au personnel. Délai estimé : 10 minutes.</p>
        </div>
      </Modal>
    </div>
  );
}
