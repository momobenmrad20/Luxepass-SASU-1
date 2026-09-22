// ─────────────────────────────────────────────────────────────
// pmsDemo.js — données de démonstration du PMS + createDefaultAppState().
// Extrait tel quel de l'ancien components/common/constants.js — aucune valeur modifiée.
// ─────────────────────────────────────────────────────────────
import { gold } from "../components/common/theme";
import { SERVICES_CATALOG } from "./services";

export const PMS_GUESTS = [
  { id: "g1", name: "Sofia Al-Rashid", room: "501", status: "AI Validé", arrival: "Arrivée ce soir", nationality: "🇦🇪", checkedIn: false, hasChildren: true, children: [{ name: "Layla", age: 7 }], vipTier: "gold", stays: 3 },
  { id: "g2", name: "Jean-Pierre Moreau", room: "312", status: "AI Validé", arrival: "Présent", nationality: "🇫🇷", checkedIn: true, hasChildren: false, children: [], vipTier: "silver", stays: 5 },
  { id: "g3", name: "Amira Benali", room: "220", status: "Intervention Desk", arrival: "Présent", nationality: "🇹🇳", checkedIn: true, hasChildren: true, children: [{ name: "Youssef", age: 4 }, { name: "Nour", age: 9 }], vipTier: null, stays: 1 },
  { id: "g4", name: "Marcus Steinberg", room: "408", status: "AI Validé", arrival: "Check-out demain", nationality: "🇩🇪", checkedIn: true, hasChildren: false, children: [], vipTier: "platinum", stays: 11 },
];

// ── Sécurité Familles — bracelets connectés (données simulées le temps du pilote) ──
export const BRACELETS = [
  { id: "br1", guestId: "g1", childName: "Layla", room: "501", battery: 78, zone: "Piscine principale", status: "ok", lastPing: "il y a 12s" },
  { id: "br2", guestId: "g3", childName: "Youssef", room: "220", battery: 45, zone: "Plage privée", status: "alert", lastPing: "il y a 4s" },
  { id: "br3", guestId: "g3", childName: "Nour", room: "220", battery: 91, zone: "Kids Club", status: "ok", lastPing: "il y a 8s" },
];

// ── Programme de fidélité / reconnaissance VIP ──
export const VIP_TIERS = {
  platinum: { label: "Platine", color: "#E5E4E2", perks: ["Surclassement automatique", "Late check-out 16h", "Majordome dédié"] },
  gold: { label: "Or", color: "#D4AF37", perks: ["Surclassement sous réserve", "Late check-out 14h", "Welcome amenity"] },
  silver: { label: "Argent", color: "#C0C0C0", perks: ["Late check-out 13h", "Welcome drink"] },
};

// ── Événements & Banquets (MICE) ──
export const EVENTS_BANQUETS = [
  { id: "ev1", name: "Mariage — Famille Trabelsi", type: "Mariage", date: "2026-09-12", room: "Salle Méditerranée", pax: 180, status: "confirmed", deposit: 15000, roomsBlocked: 24 },
  { id: "ev2", name: "Séminaire — Groupe TotalEnergies", type: "Séminaire", date: "2026-09-03", room: "Salle Carthage", pax: 60, status: "confirmed", deposit: 8000, roomsBlocked: 30 },
  { id: "ev3", name: "Anniversaire privé — Famille Al-Rashid", type: "Privé", date: "2026-09-20", room: "Terrasse Vue Mer", pax: 25, status: "pending", deposit: 0, roomsBlocked: 0 },
];

// ── Planning du personnel ──
export const STAFF_SCHEDULE = [
  { id: "st1", name: "Yassine K.", role: "Réception", shift: "06:00–14:00", day: "Aujourd'hui" },
  { id: "st2", name: "Amina B.", role: "Housekeeping", shift: "07:00–15:00", day: "Aujourd'hui" },
  { id: "st3", name: "Karim T.", role: "Sécurité", shift: "14:00–22:00", day: "Aujourd'hui" },
  { id: "st4", name: "Sami R.", role: "Maintenance", shift: "08:00–16:00", day: "Aujourd'hui" },
  { id: "st5", name: "Nadia F.", role: "Spa", shift: "09:00–17:00", day: "Aujourd'hui" },
];

export const ROOMS_STATUS = [
  { id: "101", status: "ready" }, { id: "102", status: "cleaning" },
  { id: "103", status: "ready" }, { id: "201", status: "maintenance" },
  { id: "202", status: "ready" }, { id: "312", status: "ready" },
  { id: "408", status: "ready" }, { id: "501", status: "cleaning" },
];

export const STAFF_TICKETS = [
  { id: "t1", priority: "HIGH", guest: "Sofia Al-Rashid", room: "501", req: "Réservation Yacht 3h — demain 14h", time: "Il y a 5 min" },
  { id: "t2", priority: "MED", guest: "Jean-Pierre Moreau", room: "312", req: "Oreillers à mémoire de forme x3", time: "Il y a 22 min" },
  { id: "t3", priority: "LOW", guest: "Marcus Steinberg", room: "408", req: "Room Service — Petit-déjeuner 8h00", time: "Il y a 1h" },
];

export const MAINTENANCE_TICKETS = [
  { id: "mt1", room: "201", issue: "Climatiseur en panne", brand: "Daikin RXS35K", parts: ["Filtre F1-4K", "Carte PCB-D12"], eta: "2h30", priority: "HIGH" },
  { id: "mt2", room: "115", issue: "Fuite robinet douche", brand: "Hansgrohe Focus", parts: ["Joint EPDM 40mm", "Cartouche céramique"], eta: "45min", priority: "MED" },
];

// Fabrique un état PMS "neuf" et indépendant (copies fraîches, aucune référence
// partagée) — utilisé pour isoler les données PMS par hôtel (voir appStateByHotel
// dans LuxePassApp). Déclarée comme fonction : safe même si les mocks référencés
// (PMS_GUESTS, ROOMS_STATUS, etc.) sont définis plus bas dans le fichier, car le
// corps n'est évalué qu'à l'appel, jamais au chargement du module.
export function createDefaultAppState() {
  return {
    guest: null,
    pmsGuests: [...PMS_GUESTS],
    rooms: [...ROOMS_STATUS],
    liveTickets: [],
    liveMaintenance: [],
    liveOrders: [],
    folios: {},
    memories: {},
    services: [...SERVICES_CATALOG],
    policeForms: [],
    reservations: [...RESERVATIONS],
    roomDetailStatus: { ...ROOM_DETAIL_STATUS },
    smartLocks: [...SMART_LOCKS],
    fnbStock: [...FNB_STOCK],
    waitlist: [...WAITLIST],
    staffSchedule: [...STAFF_SCHEDULE],
    nightAuditLog: [],
    auditLog: [],
    crmBlacklist: {},
    teleDeclarationStatus: {},
  };
}

// ─────────────────────────────────────────────────────────────
// MOCK DATA — MODULES PMS AVANCÉS (cœur métier / secondaire / IA)
// ─────────────────────────────────────────────────────────────

// 1. Réservations multi-canal & 2. Yield/Revenue management
// Catégories réelles Oceana Hotel & Spa — 208 suites de 65 m², vue piscine, jardins ou mer
// (source officielle : hoteloceanasuites.tn/rooms/ — répartition exacte à confirmer avec l'hôtel)
export const ROOM_TYPES = [
  { id: "suite_piscine", name: "Suite Vue Piscine (65 m²)", total: 70, baseRate: 300 },
  { id: "suite_jardin", name: "Suite Vue Jardin (65 m²)", total: 78, baseRate: 340 },
  { id: "suite_mer", name: "Suite Vue Mer (65 m²)", total: 60, baseRate: 420 },
];

export const CHANNELS = [
  { key: "direct", label: "Direct / Site Web", color: "#34d399" },
  { key: "booking", label: "Booking.com", color: "#003580" },
  { key: "expedia", label: "Expedia", color: "#febb02" },
  { key: "gds", label: "GDS / Agences", color: "#8b5cf6" },
  { key: "group", label: "Groupe / MICE", color: gold },
];

export const RESERVATIONS = [
  { id: "res1", guestName: "Karim El Fassi", roomType: "suite_mer", checkIn: "2026-08-22", checkOut: "2026-08-26", channel: "booking", status: "confirmed", rate: 420, pax: 2 },
  { id: "res2", guestName: "Groupe Renault Tunisie (12 pax)", roomType: "suite_jardin", checkIn: "2026-08-25", checkOut: "2026-08-28", channel: "group", status: "confirmed", rate: 300, pax: 12, groupName: "Séminaire Renault" },
  { id: "res3", guestName: "Elena Kowalski", roomType: "suite_mer", checkIn: "2026-08-23", checkOut: "2026-08-30", channel: "direct", status: "confirmed", rate: 420, pax: 2 },
  { id: "res4", guestName: "Ahmed Ben Salah", roomType: "suite_mer", checkIn: "2026-08-24", checkOut: "2026-08-27", channel: "gds", status: "waitlist", rate: 420, pax: 2 },
  { id: "res5", guestName: "Sophie Laurent", roomType: "suite_jardin", checkIn: "2026-08-21", checkOut: "2026-08-23", channel: "expedia", status: "pending", rate: 340, pax: 1 },
];

export const YIELD_FACTORS = [
  { key: "occupancy", label: "Taux d'occupation prévu", impact: 8 },
  { key: "weather", label: "Météo favorable (7j)", impact: 3 },
  { key: "event", label: "Festival International Hammamet", impact: 12 },
  { key: "competitor", label: "Tarifs concurrents en hausse", impact: 5 },
  { key: "leadtime", label: "Réservations dernière minute", impact: -4 },
];

// 3. Folio complet & facturation / 8. PCI-DSS tokenisation
export const INVOICE_ENTRIES_SAMPLE = [
  { label: "Hébergement (3 nuits)", amount: 1020 },
  { label: "Taxe de séjour (2 pers. × 3 nuits)", amount: 18 },
  { label: "TVA 13%", amount: 134.9 },
];

export const PAYMENT_TOKENS = [
  { id: "tok1", guestId: "g1", last4: "4831", brand: "Visa", token: "tok_9f3ac7e21b", preAuth: 500, status: "active" },
  { id: "tok2", guestId: "g2", last4: "2290", brand: "Mastercard", token: "tok_1cd88a04ef", preAuth: 300, status: "active" },
  { id: "tok4", guestId: "g4", last4: "7765", brand: "Amex", token: "tok_77bb21f9c3", preAuth: 800, status: "active" },
];

// 5. Housekeeping avancé
export const HOUSEKEEPING_STAFF = ["Amel T.", "Rania K.", "Nabil S.", "Wided B."];
export const ROOM_DETAIL_STATUS = {
  "101": { status: "ready", assignedTo: "Amel T.", avgMinutes: 22, inspected: true },
  "102": { status: "dirty", assignedTo: "Rania K.", avgMinutes: null, inspected: false },
  "103": { status: "ready", assignedTo: "Amel T.", avgMinutes: 19, inspected: true },
  "201": { status: "out_of_order", assignedTo: null, avgMinutes: null, inspected: false },
  "202": { status: "ready", assignedTo: "Nabil S.", avgMinutes: 25, inspected: true },
  "312": { status: "inspected", assignedTo: "Wided B.", avgMinutes: 21, inspected: true },
  "408": { status: "dirty", assignedTo: "Rania K.", avgMinutes: null, inspected: false },
  "501": { status: "cleaning", assignedTo: "Nabil S.", avgMinutes: null, inspected: false },
};

// 6. CRM unifié multi-séjours
export const CRM_PROFILES = [
  { id: "g1", name: "Sofia Al-Rashid", totalStays: 7, hotelsVisited: ["Oceana Hammamet", "Magic Resort"], tier: "Platinum", lifetimeValue: 24800, blacklisted: false, prefs: ["Oreiller ferme", "Étage élevé", "Sans gluten"] },
  { id: "g2", name: "Jean-Pierre Moreau", totalStays: 3, hotelsVisited: ["Oceana Hammamet"], tier: "Gold", lifetimeValue: 8200, blacklisted: false, prefs: ["Chambre calme"] },
  { id: "g3", name: "Amira Benali", totalStays: 1, hotelsVisited: ["Oceana Hammamet"], tier: "Silver", lifetimeValue: 1450, blacklisted: false, prefs: [] },
  { id: "g4", name: "Marcus Steinberg", totalStays: 12, hotelsVisited: ["Oceana Hammamet", "Magic Resort", "Radisson Tunis"], tier: "Black", lifetimeValue: 61200, blacklisted: false, prefs: ["Champagne à l'arrivée", "Late check-out"] },
];

// 9. Reporting
export const FORECAST_7D = [
  { day: "Jeu", occ: 82 }, { day: "Ven", occ: 91 }, { day: "Sam", occ: 96 },
  { day: "Dim", occ: 88 }, { day: "Lun", occ: 74 }, { day: "Mar", occ: 69 }, { day: "Mer", occ: 79 },
];

export const COMP_SET = [
  { name: "Notre hôtel", adr: 342, revpar: 298 },
  { name: "Four Seasons Tunis", adr: 410, revpar: 350 },
  { name: "Mövenpick Gammarth", adr: 295, revpar: 240 },
  { name: "The Residence Tunis", adr: 380, revpar: 320 },
];

// 10. Serrures électroniques connectées
export const SMART_LOCKS = [
  { room: "501", locked: true, battery: 88, lastAccess: "Il y a 12 min — Client (badge digital)" },
  { room: "312", locked: true, battery: 45, lastAccess: "Il y a 2h — Housekeeping" },
  { room: "220", locked: false, battery: 91, lastAccess: "Il y a 5 min — Client (mobile key)" },
  { room: "408", locked: true, battery: 12, lastAccess: "Il y a 1j — Client" },
];

// 11. F&B stock & POS
export const FNB_STOCK = [
  { id: "st1", name: "Homard breton", category: "Cuisine", qty: 14, unit: "pièces", threshold: 10 },
  { id: "st2", name: "Champagne Rosé", category: "Bar", qty: 6, unit: "bouteilles", threshold: 8 },
  { id: "st3", name: "Filet de bœuf", category: "Cuisine", qty: 22, unit: "kg", threshold: 10 },
  { id: "st4", name: "Eau minérale 50cl", category: "Room Service", qty: 340, unit: "unités", threshold: 100 },
  { id: "st5", name: "Café Arabica", category: "Bar", qty: 4, unit: "kg", threshold: 5 },
];

// 12. Rôles & permissions & audit trail
// Hiérarchie complète d'un hôtel 5★, organisée par direction/département.
// "modules" référence les clés réelles des onglets PMS (voir allModuleKeys dans RolesAudit).
export const STAFF_DEPARTMENTS = [
  "Direction Générale",
  "Hébergement",
  "Restauration (F&B)",
  "Spa & Bien-être",
  "Commercial & Marketing",
  "Finance & Administration",
  "Technique, Sécurité & Support",
  "Transverse",
];

export const ALL_PMS_MODULES = ["overview", "services", "police", "checkinout", "reservations", "billing", "nightaudit", "housekeeping2", "crm", "compliance", "reporting", "locks", "fnb", "roles", "noshow", "intelligence", "events", "loyalty", "familysafety", "staffing"];

export const STAFF_MEMBERS = [
  // ── Direction Générale ──
  { id: "u1", name: "Sami T.", role: "Directeur Général", department: "Direction Générale", modules: [...ALL_PMS_MODULES] },
  { id: "u2", name: "Nizar F.", role: "Directeur Général Adjoint", department: "Direction Générale", modules: ["overview", "reservations", "billing", "reporting", "crm", "intelligence", "compliance", "staffing", "noshow"] },
  { id: "u3", name: "Yosra K.", role: "Assistante de Direction", department: "Direction Générale", modules: ["overview", "reservations", "events", "staffing"] },

  // ── Hébergement (Rooms Division) ──
  { id: "u4", name: "Karim B.", role: "Directeur de l'Hébergement", department: "Hébergement", modules: ["overview", "checkinout", "reservations", "housekeeping2", "locks", "crm", "noshow", "reporting"] },
  { id: "u5", name: "Anis Z.", role: "Chef de Réception", department: "Hébergement", modules: ["checkinout", "reservations", "billing", "police", "compliance", "noshow", "locks"] },
  { id: "u6", name: "Rim S.", role: "Chef de brigade", department: "Hébergement", modules: ["checkinout", "reservations", "police"] },
  { id: "u7", name: "Nadia H.", role: "Réceptionniste", department: "Hébergement", modules: ["checkinout", "police", "reservations"] },
  { id: "u8", name: "Hedi M.", role: "Réceptionniste", department: "Hébergement", modules: ["checkinout", "police", "reservations"] },
  { id: "u9", name: "Walid A.", role: "Night Auditor", department: "Hébergement", modules: ["nightaudit", "billing", "reporting", "police"] },
  { id: "u10", name: "Mounir C.", role: "Concierge en chef (Clés d'Or)", department: "Hébergement", modules: ["services", "crm", "events", "loyalty"] },
  { id: "u11", name: "Leila M.", role: "Concierge", department: "Hébergement", modules: ["services", "events"] },
  { id: "u12", name: "Fares D.", role: "Bagagiste / Bellboy", department: "Hébergement", modules: ["services"] },
  { id: "u13", name: "Ali G.", role: "Voiturier", department: "Hébergement", modules: ["services"] },
  { id: "u14", name: "Amel T.", role: "Gouvernante Générale", department: "Hébergement", modules: ["housekeeping2", "staffing", "reporting"] },
  { id: "u15", name: "Wided B.", role: "Gouvernante d'étage", department: "Hébergement", modules: ["housekeeping2"] },
  { id: "u16", name: "Rania K.", role: "Femme de chambre", department: "Hébergement", modules: ["housekeeping2"] },
  { id: "u17", name: "Nabil S.", role: "Valet de chambre", department: "Hébergement", modules: ["housekeeping2"] },
  { id: "u18", name: "Sonia R.", role: "Lingère", department: "Hébergement", modules: ["housekeeping2"] },
  { id: "u19", name: "Ines P.", role: "Responsable Guest Relations", department: "Hébergement", modules: ["crm", "loyalty", "services", "familysafety"] },

  // ── Restauration (Food & Beverage) ──
  { id: "u20", name: "Hatem J.", role: "Directeur F&B", department: "Restauration (F&B)", modules: ["fnb", "reporting", "billing", "events"] },
  { id: "u21", name: "Youssef N.", role: "Chef Exécutif", department: "Restauration (F&B)", modules: ["fnb"] },
  { id: "u22", name: "Mehdi L.", role: "Sous-chef", department: "Restauration (F&B)", modules: ["fnb"] },
  { id: "u23", name: "Skander O.", role: "Chef de partie", department: "Restauration (F&B)", modules: ["fnb"] },
  { id: "u24", name: "Bilel Q.", role: "Commis de cuisine", department: "Restauration (F&B)", modules: ["fnb"] },
  { id: "u25", name: "Emna V.", role: "Pâtissière", department: "Restauration (F&B)", modules: ["fnb"] },
  { id: "u26", name: "Ramzi W.", role: "Directeur de Restaurant", department: "Restauration (F&B)", modules: ["fnb", "billing", "events"] },
  { id: "u27", name: "Fadi X.", role: "Maître d'hôtel", department: "Restauration (F&B)", modules: ["fnb", "billing"] },
  { id: "u28", name: "Sabrine Y.", role: "Chef de rang", department: "Restauration (F&B)", modules: ["fnb"] },
  { id: "u29", name: "Oussama E.", role: "Serveur / Commis de salle", department: "Restauration (F&B)", modules: ["fnb"] },
  { id: "u30", name: "Chokri I.", role: "Chef Sommelier", department: "Restauration (F&B)", modules: ["fnb"] },
  { id: "u31", name: "Aymen U.", role: "Sommelier", department: "Restauration (F&B)", modules: ["fnb"] },
  { id: "u32", name: "Nour Y.", role: "Responsable Room Service", department: "Restauration (F&B)", modules: ["fnb", "services"] },
  { id: "u33", name: "Firas H.", role: "Responsable Banquets & Événementiel", department: "Restauration (F&B)", modules: ["events", "fnb", "billing", "reporting"] },

  // ── Spa & Bien-être ──
  { id: "u34", name: "Salma D.", role: "Directrice Spa", department: "Spa & Bien-être", modules: ["services", "billing", "reporting", "staffing"] },
  { id: "u35", name: "Marwa J.", role: "Praticienne Spa", department: "Spa & Bien-être", modules: ["services"] },
  { id: "u35b", name: "Sirine E.", role: "Esthéticienne", department: "Spa & Bien-être", modules: ["services"] },
  { id: "u35c", name: "Yassine K.", role: "Coach Fitness", department: "Spa & Bien-être", modules: ["services"] },
  { id: "u36", name: "Chedi B.", role: "Maître-nageur", department: "Spa & Bien-être", modules: ["services", "familysafety"] },

  // ── Commercial & Marketing ──
  { id: "u37", name: "Nesrine K.", role: "Directrice Commerciale (Sales & Marketing)", department: "Commercial & Marketing", modules: ["reservations", "reporting", "intelligence", "crm", "loyalty"] },
  { id: "u38", name: "Zied R.", role: "Responsable Revenue Management", department: "Commercial & Marketing", modules: ["intelligence", "reporting", "reservations"] },
  { id: "u39", name: "Meriem F.", role: "Chargée de clientèle", department: "Commercial & Marketing", modules: ["crm", "reservations"] },
  { id: "u39b", name: "Karim E.", role: "Responsable Événementiel (MICE)", department: "Commercial & Marketing", modules: ["events", "crm", "reservations", "fnb"] },
  { id: "u40", name: "Amine S.", role: "Responsable Communication / Digital", department: "Commercial & Marketing", modules: ["crm", "loyalty", "events"] },

  // ── Finance & Administration ──
  { id: "u41", name: "Bassem M.", role: "Directeur Financier", department: "Finance & Administration", modules: ["billing", "reporting", "compliance", "staffing"] },
  { id: "u42", name: "Dhia C.", role: "Comptable", department: "Finance & Administration", modules: ["billing", "reporting"] },
  { id: "u42b", name: "Rania F.", role: "Contrôleur de gestion", department: "Finance & Administration", modules: ["reporting", "intelligence", "billing"] },
  { id: "u43", name: "Rym A.", role: "Responsable Achats", department: "Finance & Administration", modules: ["fnb", "reporting"] },
  { id: "u44", name: "Sabra T.", role: "Responsable RH", department: "Finance & Administration", modules: ["staffing", "roles"] },
  { id: "u45", name: "Yassine G.", role: "Chargé de recrutement", department: "Finance & Administration", modules: ["staffing"] },

  // ── Technique, Sécurité & Support ──
  { id: "u46", name: "Kaïs N.", role: "Directeur Technique (Chief Engineer)", department: "Technique, Sécurité & Support", modules: ["locks", "reporting", "intelligence"] },
  { id: "u47", name: "Hichem O.", role: "Technicien Maintenance", department: "Technique, Sécurité & Support", modules: ["locks"] },
  { id: "u48", name: "Lotfi P.", role: "Chef de la Sécurité", department: "Technique, Sécurité & Support", modules: ["police", "compliance", "familysafety", "locks"] },
  { id: "u49", name: "Slim Q.", role: "Agent de Sécurité", department: "Technique, Sécurité & Support", modules: ["police", "familysafety"] },
  { id: "u50", name: "Rania L.", role: "Responsable IT", department: "Technique, Sécurité & Support", modules: ["roles", "locks", "compliance"] },
  { id: "u51", name: "Olfa V.", role: "Responsable Qualité / Développement Durable", department: "Technique, Sécurité & Support", modules: ["reporting", "intelligence"] },

  // ── Transverse ──
  { id: "u52", name: "Foued R.", role: "Responsable Conformité (PCI-DSS, RGPD, Police/Immigration)", department: "Transverse", modules: ["compliance", "police", "roles"] },
  { id: "u52b", name: "Ahlem N.", role: "Responsable Formation", department: "Transverse", modules: ["staffing"] },
];

// 13. No-show / annulation / liste d'attente
export const NOSHOW_RISK = [
  { id: "res1", guestName: "Karim El Fassi", risk: 12, reason: "Historique fiable, carte pré-autorisée" },
  { id: "res4", guestName: "Ahmed Ben Salah", risk: 68, reason: "Réservation GDS sans pré-paiement, 1er séjour" },
  { id: "res5", guestName: "Sophie Laurent", risk: 34, reason: "Réservation dernière minute, canal OTA" },
];

export const WAITLIST = [
  { id: "wl1", guestName: "Yassine Trabelsi", roomType: "suite_mer", desiredDate: "2026-08-24", notified: false },
  { id: "wl2", guestName: "Claire Dubosc", roomType: "suite_jardin", desiredDate: "2026-08-22", notified: true },
];

// 17. Maintenance prédictive IoT
export const IOT_EQUIPMENT = [
  { id: "eq1", room: "201", equipment: "Climatiseur Daikin RXS35K", health: 34, predictedFailure: "3-5 jours", trend: "down" },
  { id: "eq2", room: "115", equipment: "Chauffe-eau Ariston", health: 58, predictedFailure: "2-3 semaines", trend: "down" },
  { id: "eq3", room: "312", equipment: "Climatiseur Daikin RXS35K", health: 91, predictedFailure: "Stable", trend: "up" },
  { id: "eq4", room: "Piscine", equipment: "Pompe filtration Hayward", health: 47, predictedFailure: "1 semaine", trend: "down" },
];

// 20. Score de durabilité
export const SUSTAINABILITY_ROOMS = [
  { room: "501", energyKwh: 18, waterL: 210, score: "A" },
  { room: "312", energyKwh: 31, waterL: 340, score: "B" },
  { room: "220", energyKwh: 42, waterL: 410, score: "C" },
  { room: "408", energyKwh: 22, waterL: 250, score: "A" },
];
