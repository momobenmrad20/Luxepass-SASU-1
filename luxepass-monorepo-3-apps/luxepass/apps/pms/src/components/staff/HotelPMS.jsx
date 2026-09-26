import { useState } from "react";
import { Activity, Baby, BarChart3, Bed, Boxes, BrainCircuit, Briefcase, Calendar, CalendarClock, CalendarX, Check, ChevronRight, ClipboardCheck, DollarSign, Eye, FileText, Home, Key, Lock, Package, Shield, ShieldCheck, Star, StickyNote, UserCheck, UserCog, Users, Utensils, Wallet, Wrench, Zap } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldBadge from "@shared/components/common/GoldBadge";
import GoldButton from "@shared/components/common/GoldButton";
import KpiCard from "@shared/components/common/KpiCard";
import Modal from "@shared/components/common/Modal";
import { MAINTENANCE_TICKETS, PMS_GUESTS, ROOMS_STATUS, STAFF_TICKETS } from "@shared/constants";
import BillingCenter from "./BillingCenter";
import CRMHub from "./CRMHub";
import ComplianceCenter from "./ComplianceCenter";
import EventsBanquets from "./EventsBanquets";
import FamilySafetyPanel from "./FamilySafetyPanel";
import FnBStockPanel from "./FnBStockPanel";
import HousekeepingAdvanced from "./HousekeepingAdvanced";
import IntelligenceHub from "./IntelligenceHub";
import LoyaltyProgram from "./LoyaltyProgram";
import ManualCheckInOut from "./ManualCheckInOut";
import NightAuditModule from "./NightAuditModule";
import NoShowWaitlist from "./NoShowWaitlist";
import PoliceRecords from "./PoliceRecords";
import ReportingDashboard from "./ReportingDashboard";
import ReservationsYield from "./ReservationsYield";
import RolesAudit from "./RolesAudit";
import ServicesManager from "./ServicesManager";
import SmartLocksPanel from "./SmartLocksPanel";
import StaffScheduling from "./StaffScheduling";
import { useAppState } from "@shared/hooks/useAppState";
import { useAuth } from "@shared/hooks/useAuth";
import { useI18n } from "@shared/hooks/useI18n";
import { useLiveFeed } from "@shared/hooks/useLiveFeed";
import { useStaffActions } from "@shared/hooks/useStaffActions";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

export default function HotelPMS({ hotel }) {
  const { t, lang } = useI18n();
  const { appState, setAppState, storageAvailable } = useAppState();
  const { staffAuth, logoutStaff: onStaffLogout } = useAuth();
  const { digitalLiveFeed, digitalActiveStays, digitalFolios, digitalPendingStays } = useLiveFeed();
  const { resolveTicket: onResolveTicket, resolveMaintenance: onResolveMaintenance, advanceOrder: onAdvanceOrder, markPmsSynced: onMarkPmsSynced, digitalCheckout: onDigitalCheckout } = useStaffActions();
  const [pmsTab, setPmsTab] = useState("overview");
  const [staffRole, setStaffRole] = useState("gm");
  const [guest360, setGuest360] = useState(null);
const activeStayIds = new Set(digitalActiveStays.map(s => s.stayId));
    const guests = [
      ...digitalPendingStays
        .filter(s => !activeStayIds.has(s.stayId))
        .map(s => ({
        id: s.stayId,
        name: s.guestData ? `${s.guestData.firstName} ${s.guestData.lastName}` : "Client",
        room: s.room || "—",
        status: "AI Validé",
        arrival: "Arrivée ce soir",
        nationality: s.guestData?.nationality || "🌍",
        checkedIn: false,
        hasChildren: (s.children || []).length > 0,
        children: s.children || [],
      })),
      ...digitalActiveStays
        .filter(s => s.stage === "completed")
        .map(s => ({
          id: s.stayId,
          name: s.guestData ? `${s.guestData.firstName} ${s.guestData.lastName}` : "Client",
          room: s.room || "—",
          status: "AI Validé",
          arrival: "Présent",
          nationality: s.guestData?.nationality || "🌍",
          checkedIn: true,
          hasChildren: (s.children || []).length > 0,
          children: s.children || [],
        })),
    ];
  const rooms = appState.rooms || ROOMS_STATUS;
  // Flux réel (backend, cross-device) plutôt que l'ancien state React
  // local qui ne se voyait que dans le même onglet que le client.
  // Les stores backend n'ont pas le nom du client sur chaque enregistrement
  // (seulement stayId) — on le retrouve via digitalActiveStays.
  const guestByStay = {};
  digitalActiveStays.forEach(s => { if (s.stayId) guestByStay[s.stayId] = s; });
  const guestLabel = (stayId, room) => {
    const s = guestByStay[stayId];
    const name = s?.guestData ? `${s.guestData.firstName} ${s.guestData.lastName}` : "Client";
    return { name, room: s?.room || room || "—" };
  };
  const relativeTime = (iso) => {
    if (!iso) return "";
    const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    return `Il y a ${Math.round(diffMin / 60)} h`;
  };
  const ORDER_STATUS_LABEL = { pending: "En préparation", in_progress: "En livraison", completed: "Livré", cancelled: "Annulé" };
  const NEXT_ORDER_STATUS = { pending: "in_progress", in_progress: "completed", completed: "completed" };

  const liveTickets = (digitalLiveFeed.tickets || [])
    .filter(x => x.status === "pending" || x.status === "in_progress")
    .map(x => ({ ...x, ...guestLabel(x.stayId, x.room), time: relativeTime(x.createdAt), live: true }));
  const liveMaintenance = (digitalLiveFeed.maintenance || [])
    .filter(x => x.status === "pending" || x.status === "in_progress")
    .map(x => ({ ...x, room: x.room || guestByStay[x.stayId]?.room || "—", brand: x.equipment, eta: "À évaluer", parts: [], live: true }));
  const liveOrders = (digitalLiveFeed.orders || []).map(o => ({
  ...o,
  ...guestLabel(o.stayId, o.room),
  items: (o.items || []).map(i => `${i.qty}× ${i.name}`),
  status: ORDER_STATUS_LABEL[o.status] || o.status,
  rawStatus: o.status,
  time: relativeTime(o.createdAt),
}));

  const resolveTicket = (id) => onResolveTicket?.(id);
  const resolveMaintenance = (id) => onResolveMaintenance?.(id);
  const advanceOrder = (id) => {
    const current = liveOrders.find(o => o.id === id);
    const next = NEXT_ORDER_STATUS[current?.rawStatus] || "completed";
    onAdvanceOrder?.(id, next);
  };

  const staffRoles = [
    { key: "gm", label: t.gmCopilot, icon: Briefcase },
    { key: "butler", label: t.butlerCopilot, icon: Star },
    { key: "housekeeping", label: t.housekeepingCopilot, icon: Home },
    { key: "maintenance", label: t.maintenanceCopilot, icon: Wrench },
  ];

  const roomStatusColor = (s) => s === "ready" ? "text-emerald-400" : s === "cleaning" ? "text-amber-400" : "text-red-400";
  const roomStatusLabel = (s) => s === "ready" ? t.ready : s === "cleaning" ? t.cleaning : t.maintenance_status;

  return (
    <div className="min-h-screen px-4 py-6 space-y-6" style={{ background: "#080808" }}>
      {/* KPIs */}
      <div>
        <h2 className="text-xl font-bold text-white mb-1">{hotel?.name}</h2>
        <p className="text-white/40 text-sm mb-4">{t.pms}</p>
        <div className="grid grid-cols-2 gap-3">
          <KpiCard icon={Users} label={t.occupancyRate} value="87%" trend={3} />
          <KpiCard icon={DollarSign} label={t.revPAR} value="342 DT" trend={5} />
          <KpiCard icon={BrainCircuit} label={t.aiCheckIns} value="94%" sub="Sans intervention humaine" trend={2} />
          <KpiCard icon={Activity} label={t.activeGuests} value={digitalActiveStays.filter(s => s.stage === "completed").length} />
        </div>
        {/* Indicateur de synchronisation temps réel — désormais backend réel, cross-device */}
        <div className="flex items-center gap-2 mt-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "#34d399" }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#34d399" }} />
          </span>
          <p className="text-xs text-white/40">{t.syncActive}</p>
          <span className="text-white/20 text-xs">•</span>
          <p className="text-xs text-white/30 flex items-center gap-1"><Lock size={10} />{staffAuth?.staff?.email}</p>
          <button onClick={onStaffLogout} className="text-xs text-white/30 underline ml-auto flex-shrink-0">Déconnexion</button>
        </div>
      </div>

      {/* Onglets du module PMS */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {[
          { key: "overview", label: t.tabOverview, icon: Activity },
          { key: "services", label: t.tabServices, icon: Package },
          { key: "police", label: t.tabPolice, icon: ShieldCheck },
          { key: "checkinout", label: t.tabCheckInOut, icon: Users },
          { key: "reservations", label: t.tabReservations, icon: CalendarClock },
          { key: "billing", label: t.tabBilling, icon: Wallet },
          { key: "nightaudit", label: t.tabNightAudit, icon: CalendarClock },
          { key: "housekeeping2", label: t.tabHousekeeping2, icon: ClipboardCheck },
          { key: "crm", label: t.tabCRM, icon: UserCheck },
          { key: "compliance", label: t.tabCompliance, icon: FileText },
          { key: "reporting", label: t.tabReporting, icon: BarChart3 },
          { key: "locks", label: t.tabLocks, icon: Key },
          { key: "fnb", label: t.tabFnB, icon: Boxes },
          { key: "roles", label: t.tabRoles, icon: UserCog },
          { key: "noshow", label: t.tabNoShow, icon: CalendarX },
          { key: "intelligence", label: t.tabIntelligence, icon: BrainCircuit },
          { key: "events", label: t.tabEvents, icon: Calendar },
          { key: "loyalty", label: t.tabLoyalty, icon: Star },
          { key: "familysafety", label: t.tabFamilySafety, icon: Shield },
          { key: "staffing", label: t.tabStaffing, icon: CalendarClock },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setPmsTab(key)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={pmsTab === key ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)" }}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {pmsTab === "services" && <ServicesManager hotel={hotel} />}
      {pmsTab === "police" && <PoliceRecords />}
      {pmsTab === "checkinout" && <ManualCheckInOut hotel={hotel} />}
      {pmsTab === "reservations" && <ReservationsYield hotel={hotel} />}
      {pmsTab === "billing" && <BillingCenter hotel={hotel} />}
      {pmsTab === "nightaudit" && <NightAuditModule hotel={hotel} />}
      {pmsTab === "housekeeping2" && <HousekeepingAdvanced />}
      {pmsTab === "crm" && <CRMHub hotel={hotel} />}
      {pmsTab === "compliance" && <ComplianceCenter />}
      {pmsTab === "reporting" && <ReportingDashboard hotel={hotel} />}
      {pmsTab === "locks" && <SmartLocksPanel />}
      {pmsTab === "fnb" && <FnBStockPanel />}
      {pmsTab === "roles" && <RolesAudit />}
      {pmsTab === "noshow" && <NoShowWaitlist hotel={hotel} />}
      {pmsTab === "intelligence" && <IntelligenceHub hotel={hotel} />}
      {pmsTab === "events" && <EventsBanquets hotel={hotel} />}
      {pmsTab === "loyalty" && <LoyaltyProgram hotel={hotel} />}
      {pmsTab === "familysafety" && <FamilySafetyPanel hotel={hotel} />}
      {pmsTab === "staffing" && <StaffScheduling />}

      {pmsTab === "overview" && (
      <>
      {/* Live Guest Monitor — cliquable → Guest 360 (mémoire IA + folio) */}
      <div>
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Activity size={16} style={{ color: gold }} /> Moniteur Live des Clients
        </h3>
        <GlassCard className="overflow-hidden">
          {guests.map((g, i) => (
            <div key={g.id} onClick={() => setGuest360(g)} className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors ${i < guests.length - 1 ? "border-b" : ""}`}
              style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-3">
                <span className="text-lg">{g.nationality}</span>
                <div>
                  <p className="text-white text-sm font-medium">{g.name}</p>
                  <p className="text-white/40 text-xs">{t.room} {g.room} • {g.arrival}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {appState.folios?.[g.id] > 0 && <GoldBadge>{appState.folios[g.id]} {hotel.currencySymbol}</GoldBadge>}
                {g.hasChildren && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: "rgba(212,175,55,0.15)", color: gold }}>
                    <Baby size={11} /> {g.children.length}
                  </span>
                )}
                <GoldBadge>
                  {g.status === "AI Validé" ? <><Check size={10} /> {g.status}</> : g.status}
                </GoldBadge>
                <ChevronRight size={14} className="text-white/30" />
              </div>
            </div>
          ))}
        </GlassCard>
      </div>

      {/* Notes concierge réelles — mémoire des préférences saisies par le client
          (stayApi.addNote), remontées via le flux live du backend */}
      {digitalLiveFeed.notes && digitalLiveFeed.notes.length > 0 && (
        <div>
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <StickyNote size={16} style={{ color: gold }} /> Notes concierge (séjours digitaux)
          </h3>
          <GlassCard className="overflow-hidden">
            {digitalLiveFeed.notes.slice(0, 8).map((n, i) => (
              <div key={n.id} className={`px-4 py-3 ${i < Math.min(digitalLiveFeed.notes.length, 8) - 1 ? "border-b" : ""}`} style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white/50 text-xs">{t.room} {n.room || "—"}</p>
                  <p className="text-white/30 text-[10px]">{relativeTime(n.createdAt)}</p>
                </div>
                <p className="text-white text-sm">{n.text}</p>
              </div>
            ))}
          </GlassCard>
        </div>
      )}

      {/* Bannière : familles avec enfants détectées — activation auto des services enfants */}
      {guests.some(g => g.hasChildren && !g.checkedIn) && (
        <GlassCard className="p-4 flex items-center justify-between gap-3" style={{ borderColor: "rgba(212,175,55,0.35)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,175,55,0.15)" }}>
              <Baby size={18} style={{ color: gold }} />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">{t.childDetected}</p>
              <p className="text-white/40 text-xs">{t.childDetectedSub}</p>
            </div>
          </div>
          <GoldButton className="text-xs px-3 py-2 flex-shrink-0">{t.activateKidsServices}</GoldButton>
        </GlassCard>
      )}

      {/* Live Orders — flux cuisine/service temps réel */}
      {liveOrders.length > 0 && (
        <div>
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Utensils size={16} style={{ color: gold }} /> Commandes en Direct
          </h3>
          <div className="space-y-2">
            {liveOrders.map(o => (
              <GlassCard key={o.id} className="p-3 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{o.guest} — {t.room} {o.room}</p>
                  <p className="text-white/40 text-xs">{o.items.join(", ")}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold mb-1" style={{ color: gold }}>{o.total} {hotel.currencySymbol}</p>
                  <button onClick={() => advanceOrder(o.id)} className="text-xs px-2 py-1 rounded-lg" style={{ background: o.status === "Livré" ? "rgba(16,185,129,0.15)" : "rgba(212,175,55,0.15)", color: o.status === "Livré" ? "#34d399" : gold }}>
                    {o.status}
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Room Status */}
      <div>
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Bed size={16} style={{ color: gold }} /> {t.roomStatus}
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {rooms.map(r => (
            <GlassCard key={r.id} className="p-2 text-center">
              <p className="text-white font-bold text-sm">{r.id}</p>
              <p className={`text-xs mt-0.5 ${roomStatusColor(r.status)}`}>{roomStatusLabel(r.status)}</p>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* AI Copilots */}
      <div>
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <BrainCircuit size={16} style={{ color: gold }} /> Hub Copilotes IA
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4" style={{ scrollbarWidth: "none" }}>
          {staffRoles.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setStaffRole(key)}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
              style={staffRole === key ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)" }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <GlassCard className="p-5" style={{ borderColor: "rgba(212,175,55,0.25)" }}>
          {staffRole === "gm" && (
            <div className="space-y-4">
              <GoldBadge><Briefcase size={12} /> GM Copilot</GoldBadge>
              <p className="text-white/70 text-sm leading-relaxed">
                Analyse en cours : Occupation à 87% — capacité résiduelle de 32 chambres. Suggestion IA : Réduire le tarif standard de 12% pour les réservations dernière minute afin de maximiser le RevPAR. Données démographiques : 42% de voyageurs d'affaires, 31% touristes longue distance, 27% résidents.
              </p>
              <div className="grid grid-cols-3 gap-2">
                <GlassCard className="p-3 text-center">
                  <p className="text-xs text-white/40">Tarif IA Optimisé</p>
                  <p className="text-white font-bold">+8% RevPAR</p>
                </GlassCard>
                <GlassCard className="p-3 text-center">
                  <p className="text-xs text-white/40">Tendance</p>
                  <p className="text-emerald-400 font-bold">↑ Haussière</p>
                </GlassCard>
                <GlassCard className="p-3 text-center">
                  <p className="text-xs text-white/40">Prévision</p>
                  <p className="text-white font-bold">+340 DT</p>
                </GlassCard>
              </div>
            </div>
          )}

          {staffRole === "butler" && (
            <div className="space-y-3">
              <GoldBadge><Star size={12} /> Butler Copilot — {t.ticketQueue}</GoldBadge>
              {[...liveTickets, ...STAFF_TICKETS].map(ticket => (
                <div key={ticket.id} className="flex items-start justify-between gap-3 bg-white/5 rounded-xl p-3" style={ticket.live ? { border: "1px solid rgba(212,175,55,0.35)" } : {}}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold ${ticket.priority === "HIGH" ? "text-red-400" : ticket.priority === "MED" ? "text-amber-400" : "text-green-400"}`}>
                        {ticket.priority}
                      </span>
                      {ticket.sentiment && (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={
                            ticket.sentiment === "urgent" ? { background: "rgba(239,68,68,0.15)", color: "#f87171" }
                              : ticket.sentiment === "negative" ? { background: "rgba(251,146,60,0.15)", color: "#fb923c" }
                              : ticket.sentiment === "positive" ? { background: "rgba(16,185,129,0.15)", color: "#34d399" }
                              : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }
                          }
                          title="Sentiment détecté par le concierge IA sur ce message"
                        >
                          <BrainCircuit size={9} />
                          {{ urgent: "Urgent", negative: "Mécontent", positive: "Satisfait", neutral: "Neutre" }[ticket.sentiment]}
                        </span>
                      )}
                      <span className="text-xs text-white/40">{ticket.time}</span>
                      {ticket.live && <GoldBadge><Zap size={9} />NOUVEAU</GoldBadge>}
                    </div>
                    <p className="text-white text-sm">{ticket.guest} — {t.room} {ticket.room}</p>
                    <p className="text-white/60 text-xs mt-0.5">{ticket.req}</p>
                    <p className="text-xs mt-2 italic" style={{ color: gold }}>
                      Suggestion IA : « Madame/Monsieur {ticket.guest.split(" ")[1]}, votre demande a été transmise à nos prestataires partenaires certifiés. »
                    </p>
                  </div>
                  <GoldButton variant="ghost" className="flex-shrink-0 text-xs px-2 py-1" onClick={() => ticket.live && resolveTicket(ticket.id)}>
                    <Check size={12} /> OK
                  </GoldButton>
                </div>
              ))}
            </div>
          )}

          {staffRole === "housekeeping" && (
            <div className="space-y-3">
              <GoldBadge><Home size={12} /> Housekeeping Copilot</GoldBadge>
              <p className="text-xs text-white/50">Algorithme de planification automatique — Priorités mises à jour en temps réel.</p>
              {rooms.filter(r => r.status !== "ready").map(r => (
                <div key={r.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                  <div>
                    <p className="text-white font-medium text-sm">Chambre {r.id}</p>
                    <p className={`text-xs ${r.status === "cleaning" ? "text-amber-400" : "text-red-400"}`}>
                      {r.status === "cleaning" ? "⚡ Priorité — Prochain check-in IA détecté" : "🔧 En attente maintenance"}
                    </p>
                  </div>
                  <GoldButton variant="ghost" className="text-xs px-3 py-1.5" onClick={() => setAppState(prev => ({ ...prev, rooms: (prev.rooms || ROOMS_STATUS).map(x => x.id === r.id ? { ...x, status: "ready" } : x) }))}>Assigner</GoldButton>
                </div>
              ))}
            </div>
          )}

          {staffRole === "maintenance" && (
            <div className="space-y-3">
              <GoldBadge><Wrench size={12} /> Maintenance Copilot</GoldBadge>
              {[...liveMaintenance, ...MAINTENANCE_TICKETS].map(mt => (
                <GlassCard key={mt.id} className="p-4 space-y-2" style={{ borderColor: mt.live ? "rgba(212,175,55,0.4)" : mt.priority === "HIGH" ? "rgba(239,68,68,0.3)" : "rgba(251,191,36,0.2)" }}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${mt.priority === "HIGH" ? "text-red-400" : "text-amber-400"}`}>{mt.priority}</span>
                    <span className="text-xs text-white/40">Chambre {mt.room}</span>
                  </div>
                  {mt.live && <GoldBadge><Zap size={9} />Signalé par le client — #{mt.ticket}</GoldBadge>}
                  <p className="text-white font-medium text-sm">{mt.issue}</p>
                  <p className="text-xs text-white/50">Équipement IA : <span className="text-white/80">{mt.brand}</span></p>
                  {mt.parts?.length > 0 && (
                    <div>
                      <p className="text-xs text-white/40 mb-1">Pièces à sortir du stock :</p>
                      <div className="flex flex-wrap gap-1">
                        {mt.parts.map(p => <GoldBadge key={p}>{p}</GoldBadge>)}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-emerald-400">⏱ ETA réparation : {mt.eta}</p>
                    {mt.live && <button onClick={() => resolveMaintenance(mt.id)} className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(212,175,55,0.15)", color: gold }}>Prise en charge</button>}
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Guest 360 — mémoire IA + folio, ce que le staff ne voyait jamais avant */}
      <Modal open={!!guest360} onClose={() => setGuest360(null)} title={guest360?.name}>
        {guest360 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white/5 rounded-xl p-3">
              <span className="text-xs text-white/50">{t.room} {guest360.room} • {guest360.arrival}</span>
              <GoldBadge>{appState.folios?.[guest360.id] || 0} {hotel.currencySymbol} — Folio</GoldBadge>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-white/40 mb-2 flex items-center gap-1"><BrainCircuit size={12} style={{ color: gold }} />{t.learnedPrefs}</p>
              {(appState.memories?.[guest360.id] || []).length === 0 ? (
                <p className="text-sm text-white/40">{t.noPrefsYet}</p>
              ) : (
                <div className="space-y-2">
                  {(appState.memories?.[guest360.id] || []).map(m => (
                    <div key={m.id} className="flex items-start gap-2 bg-white/5 rounded-xl p-3">
                      <Eye size={13} style={{ color: gold }} className="mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-white/70 leading-relaxed">{m[lang] || m.fr}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
      </>
      )}
    </div>
  );
}
