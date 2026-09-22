import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import qrcode from "qrcode-generator";
import {
  Globe, Hotel, Shield, ChevronRight, ChevronLeft, Upload, Check, CreditCard,
  QrCode, Wifi, Utensils, Sparkles, Dumbbell, Car, Ship, Baby, Calendar,
  MessageSquare, Bell, Settings, Users, BarChart3, AlertTriangle, Wrench,
  BrainCircuit, TrendingUp, Package, LogOut, Star, MapPin, Phone, Clock,
  Bed, Coffee, Wind, Droplets, Home, PieChart, Activity, DollarSign,
  RefreshCw, ChevronDown, X, Plus, Minus, Send, Hash, User, Lock,
  Briefcase, Zap, Eye, ToggleLeft, ToggleRight, Search, Filter, Download,
  Building2, CreditCard as CardIcon, Layers, Database, Server, Globe2,
  Cloud, Plane, ShieldCheck, Trash2,
  Key, FileText, ShoppingBag, UserCheck, Leaf, Link2, Percent,
  ListChecks, Gauge, Fingerprint, BadgeCheck, TrendingDown, Boxes, UserCog,
  ClipboardCheck, Split, Wallet, CalendarClock, Radar, ScanFace, CalendarX,
  Shirt, Bath, Snowflake, Scissors, Umbrella, Wine, Mic, Camera, StickyNote,
} from "lucide-react";

// Client API du backend réel (voir apiClient.js du même dossier).
import { checkinApi, ordersApi, stayApi, staffAuthApi, staffApi, pmsApi, conciergeApi, paymentsApi, connectLiveFeed, getClientStay, setClientStay, clearClientStay, STAY_AUTH_LOST_EVENT, ApiError } from "./apiClient";
import { encodeQrPayload, decodeQrPayload } from "./qrPayload";
import { getPmsState, updatePmsState } from "./pmsService";
import StripeCheckoutForm from "./StripeCheckoutForm";

// Doit rester identique à PMS_STATE_KEYS dans
// luxepass-backend/src/store/pmsStateStore.ts — sections de l'appState PMS
// qui sont persistées côté serveur (partagées entre tout le staff de
// l'hôtel) plutôt qu'uniquement dans le localStorage du navigateur.
const PMS_STATE_KEYS = [
  "reservations", "yieldFactors", "invoices", "nightAuditLog", "auditLog",
  "housekeepingTasks", "crmBlacklist", "crmSegments", "teleDeclarationStatus",
  "smartLocks", "fnbStock", "waitlist", "events", "loyaltyMembers",
  "familySafety", "staffSchedule", "pmsGuests", "rooms", "services",
];

// ─────────────────────────────────────────────────────────────
// COULEURS DE MARQUE — déclarées en premier car utilisées par des
// constantes de données évaluées au chargement du module (ex: CHANNELS)
// ─────────────────────────────────────────────────────────────
const gold = "#D4AF37";
const goldDark = "#B8961E";
const hexToRgba = (hex, alpha = 1) => {
  const h = (hex || gold).replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
// Les photos sont hotlinkées depuis hoteloceanasuites.tn. Si le site bloque le
// hotlinking (Referer) ou si le réseau les bloque, on masque l'image plutôt que
// de laisser le navigateur afficher l'icône "image cassée" + le texte alt par-dessus.
const handleImgError = (e) => { e.currentTarget.style.display = "none"; };

// ─────────────────────────────────────────────────────────────
// I18N DICTIONARY
// ─────────────────────────────────────────────────────────────
const i18n = {
  fr: {
    dir: "ltr",
    tagline: "L'Hospitalité Réinventée par l'Intelligence Artificielle",
    subtitle: "Votre séjour, orchestré à la perfection.",
    selectHotel: "Sélectionnez votre établissement",
    checkIn: "Check-In Intelligent",
    stayExpired: "Session de séjour expirée ou invalide. Veuillez refaire votre check-in.",
    dashboard: "Mon Espace",
    pms: "Interface PMS Hôtel",
    admin: "Console Super Admin",
    step1: "Scan Passeport / CIN",
    step2: "Signature Légale",
    step3: "Empreinte Bancaire",
    upload: "Déposer votre pièce d'identité",
    uploadSub: "Passeport, CIN ou titre de séjour — JPG, PNG, PDF",
    analyzing: "Analyse IA en cours...",
    extracted: "Données extraites avec succès",
    firstName: "Prénom", lastName: "Nom", age: "Âge", gender: "Sexe",
    idNumber: "N° Pièce d'Identité", profession: "Profession",
    from: "Provenance", destination: "Destination Finale",
    arrival: "Date d'Arrivée", departure: "Date de Départ",
    occupants: "Nombre d'occupants",
    night: "nuit", nights: "nuits", occupantShort: "personne", occupantsShort: "personnes",
    signHere: "Signez dans ce cadre",
    clearSig: "Effacer", confirmSig: "Valider la Signature",
    cardNumber: "Numéro de Carte", cardHolder: "Titulaire",
    expiry: "Expiration", cvv: "CVV",
    generateQR: "Générer mon QR Code d'accès",
    conciergeAddonName: "Conciergerie & Bien-être",
    conciergeAddonDesc: "Accès prioritaire à notre équipe concierge pendant tout votre séjour",
    conciergeAddonAdded: "ajoutée à votre facture",
    welcome: "Bienvenue",
    room: "Chambre",
    virtualButler: "Votre Majordome Virtuel",
    services: "Services Premium",
    roomService: "Room Service",
    maintenance: "Assistance Technique",
    restaurant: "Restaurants",
    spa: "Spa & Bien-Être",
    tennis: "Tennis / Padel",
    golf: "Golf",
    yacht: "Yacht & Croisières",
    babysitting: "Conciergerie Enfants",
    supercar: "Supercars",
    taxi: "Taxi VIP",
    events: "Événements Privés",
    order: "Commander",
    reserve: "Réserver",
    request: "Demander",
    confirm: "Confirmer",
    cancel: "Annuler",
    payQR: "Payer via QR Code",
    total: "Total",
    currency: "TND",
    languages: "Langues",
    roles: "Rôles",
    clientPortal: "Portail Client",
    hotelPMS: "PMS Hôtel",
    superAdmin: "Super Admin",
    occupancyRate: "Taux d'Occupation",
    revPAR: "RevPAR",
    aiCheckIns: "Check-ins IA",
    activeGuests: "Clients Présents",
    gmCopilot: "Directeur Général",
    butlerCopilot: "Chef Concierge",
    housekeepingCopilot: "Gouvernante",
    maintenanceCopilot: "Maintenance",
    staffProfile: "Profil Personnel",
    ticketQueue: "File d'Attente",
    roomStatus: "État des Chambres",
    ready: "Prête",
    cleaning: "À Nettoyer",
    maintenance_status: "En Maintenance",
    networkStats: "Statistiques Réseau",
    billing: "Facturation SaaS",
    provisioning: "Studio de Provisioning",
    mrr: "MRR",
    hotels: "Hôtels Actifs",
    totalUsers: "Utilisateurs",
    aiAccuracy: "Précision IA OCR",
    submit: "Soumettre",
    incidentReport: "Rapport d'Incident",
    describeIssue: "Décrivez le problème...",
    analyzeAI: "Analyser par IA",
    maintenanceIntro: "Quel est le problème ?",
    maintenanceIntroSub: "Touchez une icône, c'est envoyé tout de suite.",
    issueAC: "Climatisation", issueWifi: "Wifi / Internet", issuePlumbing: "Plomberie",
    issueElec: "Électricité / TV", issueCleaning: "Ménage", issueOther: "Autre problème",
    otherDescribe: "Décrivez avec vos mots, ou utilisez le micro",
    micStart: "Appuyez et parlez", micListening: "Je vous écoute...",
    addPhoto: "Ajouter une photo", photoAdded: "Photo jointe",
    sendRequest: "Envoyer la demande",
    callReceptionNow: "Appeler la réception",
    callReceptionSub: "Un humain vous répond directement",
    ticketSent: "Demande envoyée !",
    ticketSentSub: "Notre équipe technique est prévenue.",
    etaLabel: "Délai estimé",
    newRequest: "Nouvelle demande",
    // ── Nouveaux modules PMS ──
    tabEvents: "Événements", tabLoyalty: "Fidélité", tabFamilySafety: "Sécurité Familles", tabStaffing: "Planning Équipe",
    eventsTitle: "Événements & Banquets", eventsSub: "Mariages, séminaires et événements privés à venir.",
    eventPax: "invités", eventRoomsBlocked: "chambres bloquées", eventDeposit: "Acompte",
    newEvent: "Nouvel événement", eventStatusConfirmed: "Confirmé", eventStatusPending: "En attente",
    loyaltyTitle: "Programme de Fidélité", loyaltySub: "Reconnaissance des clients à travers leurs séjours.",
    loyaltyStays: "séjours", loyaltyPerks: "Avantages", loyaltyNoTier: "Pas encore de statut",
    familySafetyTitle: "Sécurité Familles", familySafetySub: "Suivi en temps réel des bracelets connectés enfants.",
    familySafetyBattery: "Batterie", familySafetyZone: "Zone actuelle", familySafetyLastPing: "Dernier signal",
    familySafetyAlert: "Alerte zone", familySafetyOk: "Zone sécurisée",
    staffingTitle: "Planning de l'Équipe", staffingSub: "Présence et affectation du personnel du jour.",
    childDetected: "Famille avec enfant(s) détectée", childDetectedSub: "Activer automatiquement les services enfants ?",
    activateKidsServices: "Activer les services enfants",
    menu: "Menu Digital",
    addToCart: "Ajouter",
    cart: "Panier",
    checkout: "Commander",
    next: "Suivant",
    back: "Retour",
    finish: "Terminer le Check-In",
    concierge: "Concierge IA",
    chatPlaceholder: "Écrivez à votre concierge...",
    proactiveTitle: "Suggestions du moment",
    memoryTitle: "Ce que l'IA sait de vous",
    viewMemory: "Voir ma mémoire IA",
    clearMemory: "Effacer mes données",
    dataCleared: "Données effacées",
    privacyNote: "LuxePass ne partage jamais ces informations hors de votre séjour. Vous gardez le contrôle total.",
    talkHuman: "Parler à un concierge humain",
    transferring: "Transfert en cours — votre historique est partagé avec le concierge...",
    humanConnected: "Concierge humain connecté — il a accès à toute votre conversation.",
    exploreCity: "Explorer hors de l'hôtel",
    generateItinerary: "Générer mon itinéraire IA",
    itineraryFor: "Itinéraire personnalisé",
    externalPartners: "Partenaires en ville",
    sendMsg: "Envoyer",
    learnedPrefs: "Préférences apprises",
    noPrefsYet: "L'IA apprend encore vos habitudes.",
    aiTyping: "Le concierge écrit...",
    // ── Module Services / Fiches Police / Check-in-out manuel ──
    tabOverview: "Vue d'ensemble",
    tabServices: "Services",
    tabPolice: "Fiches Police",
    tabCheckInOut: "Check-In / Out",
    manageServices: "Gestion des Services",
    manageServicesSub: "Ajoutez, modifiez ou supprimez les services internes et externes de l'hôtel.",
    newService: "Nouveau service",
    editService: "Modifier le service",
    serviceName: "Nom du service",
    serviceCategory: "Catégorie",
    serviceType: "Type",
    internal: "Interne",
    external: "Externe",
    provider: "Prestataire externe",
    price: "Prix",
    active: "Actif",
    inactive: "Inactif",
    save: "Enregistrer",
    delete: "Supprimer",
    edit: "Modifier",
    noServices: "Aucun service pour le moment.",
    confirmDelete: "Confirmer la suppression ?",
    policeRecords: "Fiches de Police",
    policeRecordsSub: "Toutes les fiches remplies par les clients lors du check-in digital.",
    viewRecord: "Voir la fiche",
    idDocument: "Pièce d'identité",
    signatureCaptured: "Signature capturée",
    submittedOn: "Soumise le",
    noRecords: "Aucune fiche police enregistrée pour le moment.",
    exportRecord: "Exporter",
    manualCheckin: "Check-In Manuel",
    manualCheckout: "Check-Out Manuel",
    pendingCheckin: "En attente de check-in",
    checkedInGuests: "Clients en séjour",
    confirmCheckin: "Confirmer le Check-In",
    confirmCheckout: "Confirmer le Check-Out",
    assignRoomLabel: "Chambre à assigner",
    checkinSuccess: "Check-in confirmé avec succès",
    checkoutSuccess: "Check-out confirmé avec succès",
    noPendingCheckin: "Aucun client en attente de check-in.",
    noCheckedInGuests: "Aucun client actuellement en séjour.",
    liveSync: "Synchronisation Temps Réel",
    syncActive: "Synchronisé avec l'app client",
    lastSync: "Dernière mise à jour",
    justNow: "à l'instant",
    // ── Modules avancés PMS (16 modules cœur métier + secondaire + IA) ──
    tabReservations: "Réservations & Yield",
    tabBilling: "Facturation & Paiement",
    tabNightAudit: "Night Audit",
    tabHousekeeping2: "Housekeeping Avancé",
    tabCRM: "CRM 360°",
    tabCompliance: "Conformité",
    tabReporting: "Reporting",
    tabLocks: "Serrures Connectées",
    tabFnB: "Stock F&B",
    tabRoles: "Rôles & Audit",
    tabNoShow: "No-Show & Liste d'Attente",
    tabIntelligence: "Intelligence IA",
  },
  en: {
    dir: "ltr",
    tagline: "Hospitality Reinvented by Artificial Intelligence",
    subtitle: "Your stay, orchestrated to perfection.",
    selectHotel: "Select your establishment",
    checkIn: "Smart Check-In",
    stayExpired: "Stay session expired or invalid. Please check in again.",
    dashboard: "My Space",
    pms: "Hotel PMS Interface",
    admin: "Super Admin Console",
    step1: "Passport / ID Scan",
    step2: "Legal Signature",
    step3: "Bank Imprint",
    upload: "Drop your identity document",
    uploadSub: "Passport, National ID, or Residence Permit — JPG, PNG, PDF",
    analyzing: "AI Analysis in progress...",
    extracted: "Data successfully extracted",
    firstName: "First Name", lastName: "Last Name", age: "Age", gender: "Gender",
    idNumber: "ID Number", profession: "Profession",
    from: "Origin", destination: "Final Destination",
    arrival: "Arrival Date", departure: "Departure Date",
    occupants: "Number of occupants",
    night: "night", nights: "nights", occupantShort: "guest", occupantsShort: "guests",
    signHere: "Sign in this area",
    clearSig: "Clear", confirmSig: "Confirm Signature",
    cardNumber: "Card Number", cardHolder: "Cardholder",
    expiry: "Expiry", cvv: "CVV",
    generateQR: "Generate my Access QR Code",
    conciergeAddonName: "Concierge & Wellness",
    conciergeAddonDesc: "Priority access to our concierge team throughout your stay",
    conciergeAddonAdded: "added to your bill",
    welcome: "Welcome",
    room: "Room",
    virtualButler: "Your Virtual Butler",
    services: "Premium Services",
    roomService: "Room Service",
    maintenance: "Technical Support",
    restaurant: "Restaurants",
    spa: "Spa & Wellness",
    tennis: "Tennis / Padel",
    golf: "Golf",
    yacht: "Yacht & Cruises",
    babysitting: "Children's Concierge",
    supercar: "Supercars",
    taxi: "VIP Taxi",
    events: "Private Events",
    order: "Order",
    reserve: "Book",
    request: "Request",
    confirm: "Confirm",
    cancel: "Cancel",
    payQR: "Pay via QR Code",
    total: "Total",
    currency: "TND",
    languages: "Languages",
    roles: "Roles",
    clientPortal: "Client Portal",
    hotelPMS: "Hotel PMS",
    superAdmin: "Super Admin",
    occupancyRate: "Occupancy Rate",
    revPAR: "RevPAR",
    aiCheckIns: "AI Check-ins",
    activeGuests: "Active Guests",
    gmCopilot: "General Manager",
    butlerCopilot: "Head Concierge",
    housekeepingCopilot: "Housekeeping",
    maintenanceCopilot: "Maintenance",
    staffProfile: "Staff Profile",
    ticketQueue: "Ticket Queue",
    roomStatus: "Room Status",
    ready: "Ready",
    cleaning: "Cleaning",
    maintenance_status: "Maintenance",
    networkStats: "Network Statistics",
    billing: "SaaS Billing",
    provisioning: "Provisioning Studio",
    mrr: "MRR",
    hotels: "Active Hotels",
    totalUsers: "Users",
    aiAccuracy: "AI OCR Accuracy",
    submit: "Submit",
    incidentReport: "Incident Report",
    describeIssue: "Describe the issue...",
    analyzeAI: "Analyze with AI",
    maintenanceIntro: "What's the problem?",
    maintenanceIntroSub: "Tap an icon, it's sent right away.",
    issueAC: "Air Conditioning", issueWifi: "Wifi / Internet", issuePlumbing: "Plumbing",
    issueElec: "Electricity / TV", issueCleaning: "Housekeeping", issueOther: "Other issue",
    otherDescribe: "Describe in your own words, or use the microphone",
    micStart: "Press and speak", micListening: "Listening...",
    addPhoto: "Add a photo", photoAdded: "Photo attached",
    sendRequest: "Send request",
    callReceptionNow: "Call reception",
    callReceptionSub: "A person will answer you directly",
    ticketSent: "Request sent!",
    ticketSentSub: "Our technical team has been notified.",
    etaLabel: "Estimated time",
    newRequest: "New request",
    // ── New PMS modules ──
    tabEvents: "Events", tabLoyalty: "Loyalty", tabFamilySafety: "Family Safety", tabStaffing: "Staff Schedule",
    eventsTitle: "Events & Banquets", eventsSub: "Upcoming weddings, seminars and private events.",
    eventPax: "guests", eventRoomsBlocked: "rooms blocked", eventDeposit: "Deposit",
    newEvent: "New event", eventStatusConfirmed: "Confirmed", eventStatusPending: "Pending",
    loyaltyTitle: "Loyalty Program", loyaltySub: "Guest recognition across their stays.",
    loyaltyStays: "stays", loyaltyPerks: "Perks", loyaltyNoTier: "No tier yet",
    familySafetyTitle: "Family Safety", familySafetySub: "Real-time tracking of connected kids bracelets.",
    familySafetyBattery: "Battery", familySafetyZone: "Current zone", familySafetyLastPing: "Last ping",
    familySafetyAlert: "Zone alert", familySafetyOk: "Zone secure",
    staffingTitle: "Staff Schedule", staffingSub: "Today's staff presence and assignment.",
    childDetected: "Family with children detected", childDetectedSub: "Automatically activate kids services?",
    activateKidsServices: "Activate kids services",
    menu: "Digital Menu",
    addToCart: "Add",
    cart: "Cart",
    checkout: "Order",
    next: "Next",
    back: "Back",
    finish: "Complete Check-In",
    concierge: "AI Concierge",
    chatPlaceholder: "Message your concierge...",
    proactiveTitle: "Right now, for you",
    memoryTitle: "What the AI knows about you",
    viewMemory: "View my AI memory",
    clearMemory: "Clear my data",
    dataCleared: "Data cleared",
    privacyNote: "LuxePass never shares this outside your stay. You stay in full control.",
    talkHuman: "Talk to a human concierge",
    transferring: "Transferring — your history is being shared with the concierge...",
    humanConnected: "Human concierge connected — they have your full conversation.",
    exploreCity: "Explore beyond the hotel",
    generateItinerary: "Generate my AI itinerary",
    itineraryFor: "Personalized itinerary",
    externalPartners: "City partners",
    sendMsg: "Send",
    learnedPrefs: "Learned preferences",
    noPrefsYet: "The AI is still learning your habits.",
    aiTyping: "Concierge is typing...",
    // ── Services / Police Records / Manual Check-in-out module ──
    tabOverview: "Overview",
    tabServices: "Services",
    tabPolice: "Police Records",
    tabCheckInOut: "Check-In / Out",
    manageServices: "Services Management",
    manageServicesSub: "Add, edit, or remove the hotel's internal and external services.",
    newService: "New service",
    editService: "Edit service",
    serviceName: "Service name",
    serviceCategory: "Category",
    serviceType: "Type",
    internal: "Internal",
    external: "External",
    provider: "External provider",
    price: "Price",
    active: "Active",
    inactive: "Inactive",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    noServices: "No services yet.",
    confirmDelete: "Confirm deletion?",
    policeRecords: "Police Records",
    policeRecordsSub: "All ID forms filled by guests during digital check-in.",
    viewRecord: "View record",
    idDocument: "Identity document",
    signatureCaptured: "Signature captured",
    submittedOn: "Submitted on",
    noRecords: "No police records yet.",
    exportRecord: "Export",
    manualCheckin: "Manual Check-In",
    manualCheckout: "Manual Check-Out",
    pendingCheckin: "Pending check-in",
    checkedInGuests: "Guests in-house",
    confirmCheckin: "Confirm Check-In",
    confirmCheckout: "Confirm Check-Out",
    assignRoomLabel: "Room to assign",
    checkinSuccess: "Check-in confirmed successfully",
    checkoutSuccess: "Check-out confirmed successfully",
    noPendingCheckin: "No guest pending check-in.",
    noCheckedInGuests: "No guest currently in-house.",
    liveSync: "Real-Time Sync",
    syncActive: "Synced with client app",
    lastSync: "Last update",
    justNow: "just now",
    // ── Advanced PMS modules (core + secondary + AI) ──
    tabReservations: "Reservations & Yield",
    tabBilling: "Billing & Payment",
    tabNightAudit: "Night Audit",
    tabHousekeeping2: "Advanced Housekeeping",
    tabCRM: "CRM 360°",
    tabCompliance: "Compliance",
    tabReporting: "Reporting",
    tabLocks: "Smart Locks",
    tabFnB: "F&B Stock",
    tabRoles: "Roles & Audit",
    tabNoShow: "No-Show & Waitlist",
    tabIntelligence: "AI Intelligence",
  },
  ar: {
    dir: "rtl",
    tagline: "الضيافة الفاخرة معاد ابتكارها بالذكاء الاصطناعي",
    subtitle: "إقامتك، منسّقة على وجه الكمال.",
    selectHotel: "اختر فندقك",
    checkIn: "تسجيل الوصول الذكي",
    stayExpired: "انتهت صلاحية جلسة الإقامة أو أنها غير صالحة. يرجى إعادة تسجيل الوصول.",
    dashboard: "فضائي",
    pms: "نظام إدارة الفندق",
    admin: "لوحة المشرف العام",
    step1: "مسح جواز السفر",
    step2: "التوقيع الإلكتروني",
    step3: "البصمة البنكية",
    upload: "أرفق وثيقة هويتك",
    uploadSub: "جواز السفر أو بطاقة الهوية — JPG, PNG, PDF",
    analyzing: "جاري تحليل الذكاء الاصطناعي...",
    extracted: "تم استخراج البيانات بنجاح",
    firstName: "الاسم", lastName: "اللقب", age: "العمر", gender: "الجنس",
    idNumber: "رقم الهوية", profession: "المهنة",
    from: "المدينة / الدولة", destination: "الوجهة النهائية",
    arrival: "تاريخ الوصول", departure: "تاريخ المغادرة",
    occupants: "عدد النزلاء",
    night: "ليلة", nights: "ليالٍ", occupantShort: "شخص", occupantsShort: "أشخاص",
    signHere: "وقّع هنا",
    clearSig: "مسح", confirmSig: "تأكيد التوقيع",
    cardNumber: "رقم البطاقة", cardHolder: "اسم حامل البطاقة",
    expiry: "تاريخ الانتهاء", cvv: "CVV",
    generateQR: "إنشاء رمز QR الخاص بي",
    conciergeAddonName: "الكونسيرج والعافية",
    conciergeAddonDesc: "وصول ذو أولوية إلى فريق الكونسيرج طوال إقامتك",
    conciergeAddonAdded: "أُضيفت إلى فاتورتك",
    welcome: "مرحباً",
    room: "الغرفة",
    virtualButler: "خادمك الافتراضي",
    services: "الخدمات المميزة",
    roomService: "خدمة الغرفة",
    maintenance: "الدعم التقني",
    restaurant: "المطاعم",
    spa: "سبا والعافية",
    tennis: "التنس / البادل",
    golf: "الغولف",
    yacht: "اليخت والرحلات",
    babysitting: "رعاية الأطفال",
    supercar: "سيارات فاخرة",
    taxi: "تاكسي VIP",
    events: "الفعاليات الخاصة",
    order: "اطلب",
    reserve: "احجز",
    request: "طلب",
    confirm: "تأكيد",
    cancel: "إلغاء",
    payQR: "الدفع عبر QR",
    total: "المجموع",
    currency: "دينار",
    languages: "اللغات",
    roles: "الأدوار",
    clientPortal: "بوابة العميل",
    hotelPMS: "نظام PMS",
    superAdmin: "المشرف العام",
    occupancyRate: "معدل الإشغال",
    revPAR: "RevPAR",
    aiCheckIns: "تسجيلات الذكاء الاصطناعي",
    activeGuests: "الضيوف الحاليون",
    gmCopilot: "المدير العام",
    butlerCopilot: "كبير الخدم",
    housekeepingCopilot: "الحوكمة",
    maintenanceCopilot: "الصيانة",
    staffProfile: "الموظف",
    ticketQueue: "قائمة الطلبات",
    roomStatus: "حالة الغرف",
    ready: "جاهزة",
    cleaning: "قيد التنظيف",
    maintenance_status: "صيانة",
    networkStats: "إحصائيات الشبكة",
    billing: "فوترة SaaS",
    provisioning: "استوديو الإعداد",
    mrr: "الإيرادات الشهرية",
    hotels: "الفنادق النشطة",
    totalUsers: "المستخدمون",
    aiAccuracy: "دقة OCR",
    submit: "إرسال",
    incidentReport: "تقرير الحادثة",
    describeIssue: "صف المشكلة...",
    analyzeAI: "تحليل بالذكاء الاصطناعي",
    maintenanceIntro: "ما هي المشكلة؟",
    maintenanceIntroSub: "اضغط على أيقونة، وسيتم الإرسال فورًا.",
    issueAC: "تكييف الهواء", issueWifi: "واي فاي / إنترنت", issuePlumbing: "سباكة",
    issueElec: "كهرباء / تلفزيون", issueCleaning: "تنظيف الغرفة", issueOther: "مشكلة أخرى",
    otherDescribe: "صف المشكلة بكلماتك، أو استخدم الميكروفون",
    micStart: "اضغط وتحدث", micListening: "أستمع إليك...",
    addPhoto: "إضافة صورة", photoAdded: "تم إرفاق الصورة",
    sendRequest: "إرسال الطلب",
    callReceptionNow: "اتصل بالاستقبال",
    callReceptionSub: "سيرد عليك شخص مباشرة",
    ticketSent: "تم إرسال الطلب!",
    ticketSentSub: "تم إعلام فريقنا التقني.",
    etaLabel: "الوقت المقدر",
    newRequest: "طلب جديد",
    // ── وحدات PMS جديدة ──
    tabEvents: "الفعاليات", tabLoyalty: "الولاء", tabFamilySafety: "أمان الأسرة", tabStaffing: "جدول الموظفين",
    eventsTitle: "الفعاليات والولائم", eventsSub: "حفلات الزفاف والندوات والفعاليات الخاصة القادمة.",
    eventPax: "ضيف", eventRoomsBlocked: "غرف محجوزة", eventDeposit: "عربون",
    newEvent: "فعالية جديدة", eventStatusConfirmed: "مؤكد", eventStatusPending: "قيد الانتظار",
    loyaltyTitle: "برنامج الولاء", loyaltySub: "التعرف على الضيوف عبر إقاماتهم.",
    loyaltyStays: "إقامات", loyaltyPerks: "المزايا", loyaltyNoTier: "لا توجد فئة بعد",
    familySafetyTitle: "أمان الأسرة", familySafetySub: "تتبع فوري لأساور الأطفال المتصلة.",
    familySafetyBattery: "البطارية", familySafetyZone: "المنطقة الحالية", familySafetyLastPing: "آخر إشارة",
    familySafetyAlert: "تنبيه منطقة", familySafetyOk: "منطقة آمنة",
    staffingTitle: "جدول الموظفين", staffingSub: "حضور وتوزيع الموظفين لهذا اليوم.",
    childDetected: "تم اكتشاف عائلة بها أطفال", childDetectedSub: "تفعيل خدمات الأطفال تلقائيًا؟",
    activateKidsServices: "تفعيل خدمات الأطفال",
    menu: "القائمة الرقمية",
    addToCart: "أضف",
    cart: "السلة",
    checkout: "الطلب",
    next: "التالي",
    back: "رجوع",
    finish: "إتمام تسجيل الوصول",
    concierge: "الكونسيرج الذكي",
    chatPlaceholder: "اكتب لكونسيرجك...",
    proactiveTitle: "اقتراحات الآن",
    memoryTitle: "ما يعرفه الذكاء الاصطناعي عنك",
    viewMemory: "عرض ذاكرتي الذكية",
    clearMemory: "حذف بياناتي",
    dataCleared: "تم حذف البيانات",
    privacyNote: "لا تشارك LuxePass هذه المعلومات خارج إقامتك أبداً. أنت من يتحكم بالكامل.",
    talkHuman: "التحدث مع كونسيرج بشري",
    transferring: "جارٍ التحويل — يتم مشاركة سجلك مع الكونسيرج...",
    humanConnected: "تم توصيلك بكونسيرج بشري — لديه كامل سجل المحادثة.",
    exploreCity: "استكشاف خارج الفندق",
    generateItinerary: "إنشاء برنامجي الذكي",
    itineraryFor: "برنامج مخصص",
    externalPartners: "شركاء في المدينة",
    sendMsg: "إرسال",
    learnedPrefs: "التفضيلات المكتسبة",
    noPrefsYet: "لا يزال الذكاء الاصطناعي يتعلم عاداتك.",
    aiTyping: "الكونسيرج يكتب...",
    // ── وحدة الخدمات / بطاقات الشرطة / تسجيل الوصول والمغادرة اليدوي ──
    tabOverview: "نظرة عامة",
    tabServices: "الخدمات",
    tabPolice: "بطاقات الشرطة",
    tabCheckInOut: "الوصول / المغادرة",
    manageServices: "إدارة الخدمات",
    manageServicesSub: "أضف أو عدّل أو احذف الخدمات الداخلية والخارجية للفندق.",
    newService: "خدمة جديدة",
    editService: "تعديل الخدمة",
    serviceName: "اسم الخدمة",
    serviceCategory: "الفئة",
    serviceType: "النوع",
    internal: "داخلية",
    external: "خارجية",
    provider: "المزوّد الخارجي",
    price: "السعر",
    active: "فعّالة",
    inactive: "غير فعّالة",
    save: "حفظ",
    delete: "حذف",
    edit: "تعديل",
    noServices: "لا توجد خدمات بعد.",
    confirmDelete: "تأكيد الحذف؟",
    policeRecords: "بطاقات الشرطة",
    policeRecordsSub: "جميع استمارات الهوية التي عبّأها الضيوف أثناء تسجيل الوصول الرقمي.",
    viewRecord: "عرض البطاقة",
    idDocument: "وثيقة الهوية",
    signatureCaptured: "تم تسجيل التوقيع",
    submittedOn: "تاريخ الإرسال",
    noRecords: "لا توجد بطاقات شرطة مسجلة بعد.",
    exportRecord: "تصدير",
    manualCheckin: "تسجيل وصول يدوي",
    manualCheckout: "تسجيل مغادرة يدوي",
    pendingCheckin: "بانتظار تسجيل الوصول",
    checkedInGuests: "الضيوف المقيمون",
    confirmCheckin: "تأكيد تسجيل الوصول",
    confirmCheckout: "تأكيد تسجيل المغادرة",
    assignRoomLabel: "الغرفة المخصصة",
    checkinSuccess: "تم تأكيد تسجيل الوصول بنجاح",
    checkoutSuccess: "تم تأكيد تسجيل المغادرة بنجاح",
    noPendingCheckin: "لا يوجد ضيف بانتظار تسجيل الوصول.",
    noCheckedInGuests: "لا يوجد ضيف مقيم حالياً.",
    liveSync: "مزامنة فورية",
    syncActive: "متزامن مع تطبيق العميل",
    lastSync: "آخر تحديث",
    justNow: "الآن",
    // ── وحدات PMS المتقدمة (أساسية + ثانوية + ذكاء اصطناعي) ──
    tabReservations: "الحجوزات والتسعير",
    tabBilling: "الفوترة والدفع",
    tabNightAudit: "تدقيق الليل",
    tabHousekeeping2: "الحوكمة المتقدمة",
    tabCRM: "إدارة علاقات العملاء",
    tabCompliance: "الامتثال التنظيمي",
    tabReporting: "التقارير",
    tabLocks: "الأقفال الذكية",
    tabFnB: "مخزون المطاعم",
    tabRoles: "الأدوار والتدقيق",
    tabNoShow: "عدم الحضور وقائمة الانتظار",
    tabIntelligence: "الذكاء الاصطناعي",
  },
};

// ─────────────────────────────────────────────────────────────
// HOTEL CONFIGS
// ─────────────────────────────────────────────────────────────
const HOTELS = [
  {
    id: "oceana",
    name: "Oceana Hotel & Spa",
    location: "Hammamet Sud, Tunisie",
    address: "B.P. 58, Manaret el Hammamet, Hammamet Sud",
    phone: "+216 72 227 227",
    whatsapp: "+216 98 76 52 09",
    email: "resa@hoteloceanasuites.com",
    lat: 36.3863252,
    lng: 10.5503951,
    currency: "TND",
    currencySymbol: "DT",
    accent: "#D4AF37",
    image: "https://hoteloceanasuites.tn/img/248e6becfb0f7e01.webp",
    logo: "https://hoteloceanasuites.tn/img/f110ce23e182d7b6.webp",
    stars: 5,
    description: "Un hôtel niché dans une palmeraie face à la Méditerranée — 208 suites, spa Wellness et hospitalité tunisienne raffinée.",
    rooms: 208,
    restaurants: ["Restaurant Oceana", "Il Giardino", "Le Pacha", "Le Seaside"],
    bars: ["Lobby Bar", "Café Maure", "Seaside Bar", "O'Sea"],
  },
  {
    id: "magic",
    name: "Hôtel Magic Resort",
    location: "Monastir, Tunisie",
    currency: "TND",
    currencySymbol: "DT",
    accent: "#C09A3D",
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80",
    stars: 5,
    description: "Le Resort du bien-être total, niché entre mer et verdure.",
    rooms: 312,
  },
];

// ─────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────
const MOCK_GUEST = {
  firstName: "Sofia", lastName: "Al-Rashid", age: 34, gender: "F",
  idNumber: "TN-2891-4567", profession: "Architecte",
  from: "Dubaï, Émirats Arabes Unis", destination: "Paris, France",
  arrival: "2026-06-11", departure: "2026-06-18",
};

// Galerie photo officielle Oceana Hotel & Spa — hoteloceanasuites.tn/fr-fr/photos/
const OCEANA_GALLERY = {
  "Hôtel & Espaces": [
    "https://hoteloceanasuites.tn/img/248e6becfb0f7e01.webp",
    "https://hoteloceanasuites.tn/img/9b683bca3d9d713d.webp",
    "https://hoteloceanasuites.tn/img/fd164dd1915add8f.webp",
    "https://hoteloceanasuites.tn/img/404715c210d9a212.webp",
  ],
  "Chambres": [
    "https://hoteloceanasuites.tn/img/0b590cbb14bfecad.webp",
    "https://hoteloceanasuites.tn/img/1c785f5f2bcd80c9.webp",
    "https://hoteloceanasuites.tn/img/8de591f31312ebb8.webp",
    "https://hoteloceanasuites.tn/img/83f0296cbc1f1c3d.webp",
    "https://hoteloceanasuites.tn/img/d174aaa37121941f.webp",
  ],
  "Piscines & Plage": [
    "https://hoteloceanasuites.tn/img/c185d542f91ada27.webp",
    "https://hoteloceanasuites.tn/img/6ad1f03498294c01.webp",
    "https://hoteloceanasuites.tn/img/215ea0a822621dd6.webp",
    "https://hoteloceanasuites.tn/img/f85d61d07702a074.webp",
    "https://hoteloceanasuites.tn/img/5402495554fe2fd1.webp",
  ],
  "Restaurants & Bars": [
    "https://hoteloceanasuites.tn/img/08cc2351327dcc73.webp",
    "https://hoteloceanasuites.tn/img/e85762e63ad4519c.webp",
    "https://hoteloceanasuites.tn/img/f883285ed2357615.webp",
    "https://hoteloceanasuites.tn/img/15fd4f22488a87f8.webp",
    "https://hoteloceanasuites.tn/img/a7a694edf1b73374.webp",
  ],
  "Spa & Bien-Être": [
    "https://hoteloceanasuites.tn/img/98a45fc4ae0970bc.webp",
    "https://hoteloceanasuites.tn/img/49e609b422233632.webp",
    "https://hoteloceanasuites.tn/img/aafee82668601d1b.webp",
    "https://hoteloceanasuites.tn/img/d743a67decd6e605.webp",
    "https://hoteloceanasuites.tn/img/c1cc593744b4b96a.webp",
  ],
};

// Restaurants & Bars réels — hoteloceanasuites.tn/fr-fr/restaurants/
const RESTAURANTS_OCEANA = [
  { id: "rst1", name: "Restaurant Oceana", type: "Restaurant", cuisine: "Buffet international", image: OCEANA_GALLERY["Restaurants & Bars"][0] },
  { id: "rst2", name: "Il Giardino", type: "Restaurant", cuisine: "Italien", image: OCEANA_GALLERY["Restaurants & Bars"][1] },
  { id: "rst3", name: "Le Pacha", type: "Restaurant", cuisine: "Traditionnel tunisien", image: OCEANA_GALLERY["Restaurants & Bars"][2] },
  { id: "rst4", name: "Le Seaside", type: "Restaurant", cuisine: "Face à la mer", image: OCEANA_GALLERY["Restaurants & Bars"][3] },
  { id: "bar1", name: "Lobby Bar", type: "Bar", cuisine: "Cocktails & boissons", image: OCEANA_GALLERY["Restaurants & Bars"][4] },
  { id: "bar2", name: "Café Maure", type: "Bar", cuisine: "Thé à la menthe, ambiance mauresque", image: OCEANA_GALLERY["Spa & Bien-Être"][0] },
  { id: "bar3", name: "Seaside Bar", type: "Bar", cuisine: "Vue mer", image: OCEANA_GALLERY["Restaurants & Bars"][0] },
  { id: "bar4", name: "O'Sea", type: "Bar", cuisine: "Piscine / plage", image: OCEANA_GALLERY["Piscines & Plage"][0] },
];
// Tenue exigée le soir : pantalon pour les messieurs, tenues de plage/shorts interdits au dîner.

// Événements Privés — expériences suggérées pour clientèle 5★, adaptées aux infrastructures réelles de l'Oceana
// (plage privée, palmeraie, spa, salle de réunion, restaurants à thème). Tarifs estimés, non publiés par l'hôtel.
const EVENTS_CATALOG = [
  { id: "ev1", name: "Dîner romantique sur la plage", desc: "Table privée au coucher du soleil, menu 4 services", price: 380, image: OCEANA_GALLERY["Piscines & Plage"][0] },
  { id: "ev2", name: "Décoration surprise en chambre", desc: "Anniversaire, demande en mariage, lune de miel", price: 150, image: OCEANA_GALLERY["Chambres"][4] },
  { id: "ev3", name: "Dîner privatisé terrasse vue mer", desc: "Le Seaside — table exclusive, service dédié", price: 320, image: OCEANA_GALLERY["Restaurants & Bars"][3] },
  { id: "ev4", name: "Dégustation de vins tunisiens", desc: "Avec sommelier, accord mets & vins", price: 180, image: OCEANA_GALLERY["Restaurants & Bars"][2] },
  { id: "ev5", name: "Cours de cuisine tunisienne privé", desc: "Le Pacha — avec le Chef, recettes traditionnelles", price: 220, image: OCEANA_GALLERY["Restaurants & Bars"][0] },
  { id: "ev6", name: "Brunch privatisé bord de piscine", desc: "Buffet sur mesure, jusqu'à 10 personnes", price: 450, image: OCEANA_GALLERY["Piscines & Plage"][1] },
  { id: "ev7", name: "Soirée Spa privatisée", desc: "Hammam & bien-être exclusif, pour couple ou groupe", price: 280, image: OCEANA_GALLERY["Spa & Bien-Être"][3] },
  { id: "ev8", name: "Yoga & méditation à l'aube", desc: "Séance privée face à la mer", price: 90, image: OCEANA_GALLERY["Piscines & Plage"][2] },
  { id: "ev9", name: "Location salle de réunion", desc: "Événement corporate ou séminaire, équipement inclus", price: 500, image: OCEANA_GALLERY["Hôtel & Espaces"][2] },
  { id: "ev10", name: "Fête d'anniversaire enfants", desc: "Bord de piscine, animation incluse", price: 200, image: OCEANA_GALLERY["Piscines & Plage"][3] },
  { id: "ev11", name: "Cérémonie du henné", desc: "Tradition tunisienne pour mariage, décor & artiste henné", price: 350, image: OCEANA_GALLERY["Hôtel & Espaces"][3] },
  { id: "ev12", name: "Cinéma privé en plein air", desc: "Écran géant sous les étoiles, transats & plaids", price: 260, image: OCEANA_GALLERY["Piscines & Plage"][4] },
];

const MENU_CATEGORY_ORDER = ["Entrées", "Plats", "Pizzas & Pâtes", "Desserts", "Boissons Chaudes", "Boissons Fraîches", "Cocktails & Bar"];

const MENU_ITEMS = [
  // Entrées
  { id: "m1", name: "Salade Tunisienne Mechouia", desc: "Le Pacha — poivrons grillés, thon, œuf mollet", price: 22, cat: "Entrées", image: OCEANA_GALLERY["Restaurants & Bars"][2] },
  { id: "m2", name: "Bruschetta Trio", desc: "Il Giardino — tomate confite, burrata, pesto", price: 28, cat: "Entrées", image: OCEANA_GALLERY["Restaurants & Bars"][1] },
  { id: "m3", name: "Carpaccio de Daurade", desc: "Le Seaside — agrumes, huile d'olive, câpres", price: 35, cat: "Entrées", image: OCEANA_GALLERY["Restaurants & Bars"][3] },
  { id: "m4", name: "Brick à l'Œuf", desc: "Le Pacha — thon, câpres, persil", price: 18, cat: "Entrées", image: OCEANA_GALLERY["Restaurants & Bars"][0] },
  // Plats
  { id: "m5", name: "Tajine Royale", desc: "Le Pacha — agneau, pruneaux, amandes confites", price: 58, cat: "Plats", image: OCEANA_GALLERY["Restaurants & Bars"][2] },
  { id: "m6", name: "Homard Thermidor", desc: "Le Seaside — homard, beurre maître d'hôtel", price: 145, cat: "Plats", image: OCEANA_GALLERY["Restaurants & Bars"][3] },
  { id: "m7", name: "Loup de Mer Grillé", desc: "Le Seaside — pêche du jour, citron confit", price: 78, cat: "Plats", image: OCEANA_GALLERY["Restaurants & Bars"][4] },
  { id: "m8", name: "Couscous Royal", desc: "Le Pacha — agneau, merguez, poulet, légumes", price: 52, cat: "Plats", image: OCEANA_GALLERY["Restaurants & Bars"][0] },
  { id: "m9", name: "Filet de Bœuf Angus", desc: "Restaurant Oceana — sauce au poivre, gratin dauphinois", price: 98, cat: "Plats", image: OCEANA_GALLERY["Restaurants & Bars"][1] },
  { id: "m10", name: "Poulet Rôti aux Épices", desc: "Restaurant Oceana — jus corsé, légumes de saison", price: 48, cat: "Plats", image: OCEANA_GALLERY["Restaurants & Bars"][2] },
  { id: "m11", name: "Sushi Omakase", desc: "Restaurant Oceana — sélection du Chef, 12 pièces", price: 95, cat: "Plats", image: OCEANA_GALLERY["Restaurants & Bars"][4] },
  // Pizzas & Pâtes
  { id: "m12", name: "Pizza Quatre Fromages", desc: "Il Giardino — mozzarella, gorgonzola, parmesan, chèvre", price: 40, cat: "Pizzas & Pâtes", image: OCEANA_GALLERY["Restaurants & Bars"][1] },
  { id: "m13", name: "Pizza Prosciutto e Funghi", desc: "Il Giardino — jambon de Parme, champignons", price: 42, cat: "Pizzas & Pâtes", image: OCEANA_GALLERY["Restaurants & Bars"][3] },
  { id: "m14", name: "Tagliatelles aux Fruits de Mer", desc: "Il Giardino — crevettes, moules, sauce safranée", price: 55, cat: "Pizzas & Pâtes", image: OCEANA_GALLERY["Restaurants & Bars"][4] },
  { id: "m15", name: "Risotto aux Champignons", desc: "Il Giardino — parmesan, truffe d'été", price: 45, cat: "Pizzas & Pâtes", image: OCEANA_GALLERY["Restaurants & Bars"][0] },
  // Desserts
  { id: "m16", name: "Fondant Beklawa", desc: "Pistache & miel de thym", price: 24, cat: "Desserts", image: OCEANA_GALLERY["Restaurants & Bars"][1] },
  { id: "m17", name: "Tiramisu Maison", desc: "Il Giardino — mascarpone, café arabica", price: 22, cat: "Desserts", image: OCEANA_GALLERY["Restaurants & Bars"][2] },
  { id: "m18", name: "Assiette de Fruits Frais", desc: "Sélection de saison", price: 18, cat: "Desserts", image: OCEANA_GALLERY["Piscines & Plage"][1] },
  { id: "m19", name: "Fondant au Chocolat", desc: "Cœur coulant, glace vanille bourbon", price: 26, cat: "Desserts", image: OCEANA_GALLERY["Restaurants & Bars"][3] },
  // Boissons Chaudes
  { id: "m20", name: "Café Turc Royal", desc: "Café Maure — arôme de cardamome, lokum artisanal", price: 18, cat: "Boissons Chaudes", image: OCEANA_GALLERY["Spa & Bien-Être"][1] },
  { id: "m21", name: "Thé à la Menthe", desc: "Café Maure — pignons de pin, service traditionnel", price: 14, cat: "Boissons Chaudes", image: OCEANA_GALLERY["Restaurants & Bars"][1] },
  { id: "m22", name: "Cappuccino Italien", desc: "Il Giardino — grains torréfiés maison", price: 16, cat: "Boissons Chaudes", image: OCEANA_GALLERY["Restaurants & Bars"][2] },
  // Boissons Fraîches
  { id: "m23", name: "Jus d'Orange Pressé", desc: "O'Sea Bar — fruits frais du jour", price: 15, cat: "Boissons Fraîches", image: OCEANA_GALLERY["Piscines & Plage"][2] },
  { id: "m24", name: "Limonade à la Menthe", desc: "Seaside Bar — citron frais, menthe fraîche", price: 14, cat: "Boissons Fraîches", image: OCEANA_GALLERY["Piscines & Plage"][3] },
  // Cocktails & Bar
  { id: "m25", name: "Cocktail Prestige", desc: "Lobby Bar — champagne rosé, fraise des bois", price: 32, cat: "Cocktails & Bar", image: OCEANA_GALLERY["Restaurants & Bars"][0] },
  { id: "m26", name: "Mojito Royal", desc: "Seaside Bar — rhum ambré, citron vert, menthe fraîche", price: 30, cat: "Cocktails & Bar", image: OCEANA_GALLERY["Piscines & Plage"][4] },
];

const ROOM_REQUESTS = [
  { id: "r1", icon: Droplets, label: "Eau minérale", price: 0, image: OCEANA_GALLERY["Chambres"][0] },
  { id: "r2", icon: Bed, label: "Oreillers mémoire de forme", price: 0, image: OCEANA_GALLERY["Chambres"][1] },
  { id: "r3", icon: Coffee, label: "Room Service café/thé", price: 12, image: OCEANA_GALLERY["Chambres"][2] },
  { id: "r4", icon: Wind, label: "Serviettes fraîches", price: 0, image: OCEANA_GALLERY["Chambres"][3] },
  { id: "r5", icon: Wine, label: "Réapprovisionnement minibar", price: 25, image: OCEANA_GALLERY["Chambres"][4] },
  { id: "r6", icon: Utensils, label: "Petit-déjeuner en chambre", price: 20, image: OCEANA_GALLERY["Restaurants & Bars"][0] },
  { id: "r7", icon: Shirt, label: "Service de repassage", price: 15, image: OCEANA_GALLERY["Chambres"][0] },
  { id: "r8", icon: Bath, label: "Kit peignoir & sandales spa", price: 0, image: OCEANA_GALLERY["Spa & Bien-Être"][0] },
  { id: "r9", icon: Leaf, label: "Thé à la menthe & pâtisseries (Café Maure)", price: 18, image: OCEANA_GALLERY["Spa & Bien-Être"][2] },
  { id: "r10", icon: Baby, label: "Kit bébé & change", price: 0, image: OCEANA_GALLERY["Chambres"][1] },
  { id: "r11", icon: Snowflake, label: "Seau à glace", price: 0, image: OCEANA_GALLERY["Chambres"][2] },
  { id: "r12", icon: Scissors, label: "Nécessaire de rasage & couture", price: 0, image: OCEANA_GALLERY["Chambres"][3] },
  { id: "r13", icon: Umbrella, label: "Réservation transats plage/piscine", price: 0, image: OCEANA_GALLERY["Piscines & Plage"][0] },
];

const PMS_GUESTS = [
  { id: "g1", name: "Sofia Al-Rashid", room: "501", status: "AI Validé", arrival: "Arrivée ce soir", nationality: "🇦🇪", checkedIn: false, hasChildren: true, children: [{ name: "Layla", age: 7 }], vipTier: "gold", stays: 3 },
  { id: "g2", name: "Jean-Pierre Moreau", room: "312", status: "AI Validé", arrival: "Présent", nationality: "🇫🇷", checkedIn: true, hasChildren: false, children: [], vipTier: "silver", stays: 5 },
  { id: "g3", name: "Amira Benali", room: "220", status: "Intervention Desk", arrival: "Présent", nationality: "🇹🇳", checkedIn: true, hasChildren: true, children: [{ name: "Youssef", age: 4 }, { name: "Nour", age: 9 }], vipTier: null, stays: 1 },
  { id: "g4", name: "Marcus Steinberg", room: "408", status: "AI Validé", arrival: "Check-out demain", nationality: "🇩🇪", checkedIn: true, hasChildren: false, children: [], vipTier: "platinum", stays: 11 },
];

// ── Sécurité Familles — bracelets connectés (données simulées le temps du pilote) ──
const BRACELETS = [
  { id: "br1", guestId: "g1", childName: "Layla", room: "501", battery: 78, zone: "Piscine principale", status: "ok", lastPing: "il y a 12s" },
  { id: "br2", guestId: "g3", childName: "Youssef", room: "220", battery: 45, zone: "Plage privée", status: "alert", lastPing: "il y a 4s" },
  { id: "br3", guestId: "g3", childName: "Nour", room: "220", battery: 91, zone: "Kids Club", status: "ok", lastPing: "il y a 8s" },
];

// ── Programme de fidélité / reconnaissance VIP ──
const VIP_TIERS = {
  platinum: { label: "Platine", color: "#E5E4E2", perks: ["Surclassement automatique", "Late check-out 16h", "Majordome dédié"] },
  gold: { label: "Or", color: "#D4AF37", perks: ["Surclassement sous réserve", "Late check-out 14h", "Welcome amenity"] },
  silver: { label: "Argent", color: "#C0C0C0", perks: ["Late check-out 13h", "Welcome drink"] },
};

// ── Événements & Banquets (MICE) ──
const EVENTS_BANQUETS = [
  { id: "ev1", name: "Mariage — Famille Trabelsi", type: "Mariage", date: "2026-09-12", room: "Salle Méditerranée", pax: 180, status: "confirmed", deposit: 15000, roomsBlocked: 24 },
  { id: "ev2", name: "Séminaire — Groupe TotalEnergies", type: "Séminaire", date: "2026-09-03", room: "Salle Carthage", pax: 60, status: "confirmed", deposit: 8000, roomsBlocked: 30 },
  { id: "ev3", name: "Anniversaire privé — Famille Al-Rashid", type: "Privé", date: "2026-09-20", room: "Terrasse Vue Mer", pax: 25, status: "pending", deposit: 0, roomsBlocked: 0 },
];

// ── Planning du personnel ──
const STAFF_SCHEDULE = [
  { id: "st1", name: "Yassine K.", role: "Réception", shift: "06:00–14:00", day: "Aujourd'hui" },
  { id: "st2", name: "Amina B.", role: "Housekeeping", shift: "07:00–15:00", day: "Aujourd'hui" },
  { id: "st3", name: "Karim T.", role: "Sécurité", shift: "14:00–22:00", day: "Aujourd'hui" },
  { id: "st4", name: "Sami R.", role: "Maintenance", shift: "08:00–16:00", day: "Aujourd'hui" },
  { id: "st5", name: "Nadia F.", role: "Spa", shift: "09:00–17:00", day: "Aujourd'hui" },
];

// Catalogue des services internes / externes de l'hôtel — géré depuis le module PMS
// Catalogue Oceana Hotel & Spa Hammamet — SPA reconstitué depuis le catalogue tarifé officiel
// "THE SPA-CATALOGUE.pdf" (hoteloceanasuites.tn/fr-fr/spa/) — soins Cinq Mondes, massages signature,
// soins humides, beauté, forfaits journée & séjours multi-jours. Prix réels en DT.
// Sport/loisirs/extras reconstitués depuis hoteloceanasuites.tn/services/ (pas de tarifs publiés → à confirmer).
// Forfait "Conciergerie & Bien-être" — pré-coché mais visible et décochable
// à l'écran de paiement du check-in (jamais caché, prix toujours affiché à
// côté de la case, jamais seulement sur le folio après coup).
// Tarif : 6 DT par nuitée et par occupant (voir computeConciergePrice ci-dessous).
const CONCIERGE_PACKAGE = { id: "concierge_pkg", name: "Conciergerie & Bien-être", pricePerNightPerPerson: 6 };

// Nombre de nuitées entre deux dates ISO (YYYY-MM-DD) — jamais moins de 1
// nuitée facturée, même si les dates saisies sont identiques/invalides.
function computeNights(arrivalIso, departureIso) {
  const a = new Date(arrivalIso);
  const d = new Date(departureIso);
  if (isNaN(a) || isNaN(d)) return 1;
  const diffDays = Math.round((d - a) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

function computeConciergePrice(arrivalIso, departureIso, occupants) {
  const nights = computeNights(arrivalIso, departureIso);
  const pax = Math.max(1, Number(occupants) || 1);
  return { nights, pax, total: CONCIERGE_PACKAGE.pricePerNightPerPerson * nights * pax };
}

const SERVICES_CATALOG = [
  // ── Soins du Visage Cinq Mondes ──
  { id: "sv1", name: "KO-BI-DO Jeunesse instantanée", category: "Spa — Visage Cinq Mondes", type: "interne", provider: "", price: 120, duration: "20min", active: true },
  { id: "sv2", name: "KO-BI-DO Re-densification", category: "Spa — Visage Cinq Mondes", type: "interne", provider: "", price: 200, duration: "50min", active: true },
  { id: "sv3", name: "Fleurs de Bali Coup d'éclat", category: "Spa — Visage Cinq Mondes", type: "interne", provider: "", price: 130, duration: "20min", active: true },
  { id: "sv4", name: "5 Fleurs de Bali Hydratant", category: "Spa — Visage Cinq Mondes", type: "interne", provider: "", price: 210, duration: "50min", active: true },
  { id: "sv5", name: "Fleurs et Fruits de Bali Perfecteur Éclat", category: "Spa — Visage Cinq Mondes", type: "interne", provider: "", price: 310, duration: "80min", active: true },

  // ── Soins du Corps Cinq Mondes — gommages ──
  { id: "sv6", name: "Gommage Aromatique aux Épices", category: "Spa — Corps Cinq Mondes", type: "interne", provider: "", price: 120, duration: "20min", active: true },
  { id: "sv7", name: "Gommage Sublime au Monoï de Tahiti", category: "Spa — Corps Cinq Mondes", type: "interne", provider: "", price: 120, duration: "20min", active: true },
  { id: "sv8", name: "Gommage Purée de Papaye", category: "Spa — Corps Cinq Mondes", type: "interne", provider: "", price: 120, duration: "20min", active: true },

  // ── Massages du corps Cinq Mondes ──
  { id: "sv9", name: "Massage Oriental Traditionnel", category: "Spa — Massages Cinq Mondes", type: "interne", provider: "", price: 210, duration: "50min", active: true },
  { id: "sv10", name: "Massage Ayurvédique Indien", category: "Spa — Massages Cinq Mondes", type: "interne", provider: "", price: 210, duration: "50min", active: true },
  { id: "sv11", name: "Massage Sublime de Polynésie", category: "Spa — Massages Cinq Mondes", type: "interne", provider: "", price: 210, duration: "50min", active: true },
  { id: "sv12", name: "Massage Sublime de Polynésie — Lâcher Prise", category: "Spa — Massages Cinq Mondes", type: "interne", provider: "", price: 310, duration: "80min", active: true },

  // ── Grands Rituels Cinq Mondes ──
  { id: "sv13", name: "Grand Rituel Impérial de Jeunesse", category: "Spa — Grands Rituels", type: "interne", provider: "", price: 330, duration: "1h40", active: true },
  { id: "sv14", name: "Grand Rituel Sublime de Polynésie", category: "Spa — Grands Rituels", type: "interne", provider: "", price: 330, duration: "1h40", active: true },
  { id: "sv15", name: "Grand Rituel de Félicité à Deux", category: "Spa — Grands Rituels", type: "interne", provider: "", price: 600, duration: "1h40", active: true },
  { id: "sv16", name: "Grand Rituel Journée Céleste", category: "Spa — Grands Rituels", type: "interne", provider: "", price: 490, duration: "2h10", active: true },

  // ── Massages Signature Oceana ──
  { id: "sv17", name: "Massage Spécial Dos", category: "Spa — Massages Signature", type: "interne", provider: "", price: 100, duration: "30min", active: true },
  { id: "sv18", name: "Massage Relaxant Intense", category: "Spa — Massages Signature", type: "interne", provider: "", price: 140, duration: "30min", active: true },
  { id: "sv19", name: "Massage Amincissant", category: "Spa — Massages Signature", type: "interne", provider: "", price: 175, duration: "40min", active: true },
  { id: "sv20", name: "Maderothérapie (1 séance)", category: "Spa — Massages Signature", type: "interne", provider: "", price: 170, duration: "40min", active: true },
  { id: "sv21", name: "Maderothérapie (forfait 5 séances)", category: "Spa — Massages Signature", type: "interne", provider: "", price: 650, duration: "5x40min", active: true },
  { id: "sv22", name: "Massage aux Pochons", category: "Spa — Massages Signature", type: "interne", provider: "", price: 180, duration: "50min", active: true },
  { id: "sv23", name: "Massage Tonique", category: "Spa — Massages Signature", type: "interne", provider: "", price: 175, duration: "40min", active: true },
  { id: "sv24", name: "Réflexologie Plantaire", category: "Spa — Massages Signature", type: "interne", provider: "", price: 90, duration: "25min", active: true },
  { id: "sv25", name: "Réflexologie Faciale", category: "Spa — Massages Signature", type: "interne", provider: "", price: 110, duration: "25min", active: true },
  { id: "sv26", name: "Massage Visage et Cuir Chevelu", category: "Spa — Massages Signature", type: "interne", provider: "", price: 70, duration: "25min", active: true },
  { id: "sv27", name: "Massage Lomi-Lomi", category: "Spa — Massages Signature", type: "interne", provider: "", price: 175, duration: "40min", active: true },
  { id: "sv28", name: "Massage Californien", category: "Spa — Massages Signature", type: "interne", provider: "", price: 175, duration: "50min", active: true },
  { id: "sv29", name: "Massage Thaï", category: "Spa — Massages Signature", type: "interne", provider: "", price: 175, duration: "50min", active: true },
  { id: "sv30", name: "Massage Shiatsu", category: "Spa — Massages Signature", type: "interne", provider: "", price: 175, duration: "50min", active: true },
  { id: "sv31", name: "Massage Ayurvédique Relaxant", category: "Spa — Massages Signature", type: "interne", provider: "", price: 175, duration: "50min", active: true },
  { id: "sv32", name: "Massage aux Pierres Chaudes", category: "Spa — Massages Signature", type: "interne", provider: "", price: 185, duration: "50min", active: true },
  { id: "sv33", name: "Drainage Lymphatique", category: "Spa — Massages Signature", type: "interne", provider: "", price: 165, duration: "50min", active: true },
  { id: "sv34", name: "Drainage Lymphatique Jambes", category: "Spa — Massages Signature", type: "interne", provider: "", price: 110, duration: "30min", active: true },
  { id: "sv35", name: "Pressothérapie Jambes", category: "Spa — Massages Signature", type: "interne", provider: "", price: 80, duration: "20min", active: true },
  { id: "sv36", name: "Pressothérapie Corps", category: "Spa — Massages Signature", type: "interne", provider: "", price: 100, duration: "20min", active: true },

  // ── Soins Humides ──
  { id: "sv37", name: "Sauna ou Hammam (accès)", category: "Spa — Soins Humides", type: "interne", provider: "", price: 50, duration: "30min", active: true },
  { id: "sv38", name: "Hammam Gommage traditionnel savon vert", category: "Spa — Soins Humides", type: "interne", provider: "", price: 70, duration: "30min", active: true },
  { id: "sv39", name: "Hammam Gommage traditionnel au Ghassoul", category: "Spa — Soins Humides", type: "interne", provider: "", price: 110, duration: "45min", active: true },
  { id: "sv40", name: "Hammam Gommage + enveloppement Algues Marines", category: "Spa — Soins Humides", type: "interne", provider: "", price: 110, duration: "45min", active: true },
  { id: "sv41", name: "Bain Hydro-massant aux Parfums de Tunisie", category: "Spa — Soins Humides", type: "interne", provider: "", price: 80, duration: "20min", active: true },
  { id: "sv42", name: "Enveloppement Algues Jambes Tonifiantes", category: "Spa — Soins Humides", type: "interne", provider: "", price: 80, duration: "20min", active: true },
  { id: "sv43", name: "Enveloppement Algues Minceur", category: "Spa — Soins Humides", type: "interne", provider: "", price: 80, duration: "20min", active: true },
  { id: "sv44", name: "Enveloppement Cocoon Lit Flottant Boue Marine", category: "Spa — Soins Humides", type: "interne", provider: "", price: 80, duration: "20min", active: true },
  { id: "sv45", name: "Enveloppement Détente Lit Flottant Algues Marines", category: "Spa — Soins Humides", type: "interne", provider: "", price: 80, duration: "20min", active: true },
  { id: "sv46", name: "Massage aromatique sous pluie d'eau", category: "Spa — Soins Humides", type: "interne", provider: "", price: 80, duration: "20min", active: true },

  // ── Beauté des mains et pieds ──
  { id: "sv47", name: "Manucure à la paraffine", category: "Beauté — Mains & Pieds", type: "interne", provider: "", price: 120, duration: "90min", active: true },
  { id: "sv48", name: "Pédicure à la paraffine", category: "Beauté — Mains & Pieds", type: "interne", provider: "", price: 120, duration: "90min", active: true },
  { id: "sv49", name: "Soins des pieds + pose vernis", category: "Beauté — Mains & Pieds", type: "interne", provider: "", price: 70, duration: "30min", active: true },
  { id: "sv50", name: "Soins des mains + pose vernis", category: "Beauté — Mains & Pieds", type: "interne", provider: "", price: 70, duration: "30min", active: true },
  { id: "sv51", name: "Pose vernis mains (classique/French)", category: "Beauté — Mains & Pieds", type: "interne", provider: "", price: 35, duration: "30min", active: true },
  { id: "sv52", name: "Pose vernis pieds (classique/French)", category: "Beauté — Mains & Pieds", type: "interne", provider: "", price: 35, duration: "30min", active: true },
  { id: "sv53", name: "Dépose vernis permanent", category: "Beauté — Onglerie Permanent", type: "interne", provider: "", price: 20, duration: "", active: true },
  { id: "sv54", name: "Pose vernis permanent (mains/pieds)", category: "Beauté — Onglerie Permanent", type: "interne", provider: "", price: 60, duration: "", active: true },
  { id: "sv55", name: "Gel sur ongles naturels + vernis permanent", category: "Beauté — Onglerie Permanent", type: "interne", provider: "", price: 90, duration: "", active: true },
  { id: "sv56", name: "French permanent sur ongles naturels", category: "Beauté — Onglerie Permanent", type: "interne", provider: "", price: 60, duration: "", active: true },

  // ── Beauté des cheveux (produits L'Oréal) ──
  { id: "sv57", name: "Rinçage cheveux L'Oréal", category: "Beauté — Cheveux", type: "interne", provider: "", price: 30, duration: "", active: true },
  { id: "sv58", name: "Brushing cheveux courts", category: "Beauté — Cheveux", type: "interne", provider: "", price: 30, duration: "", active: true },
  { id: "sv59", name: "Brushing cheveux longs", category: "Beauté — Cheveux", type: "interne", provider: "", price: 50, duration: "", active: true },
  { id: "sv60", name: "Coupe cheveux femme", category: "Beauté — Cheveux", type: "interne", provider: "", price: 70, duration: "", active: true },
  { id: "sv61", name: "Coupe cheveux homme", category: "Beauté — Cheveux", type: "interne", provider: "", price: 40, duration: "", active: true },
  { id: "sv62", name: "Coloration Majirel (L'Oréal)", category: "Beauté — Cheveux", type: "interne", provider: "", price: 120, duration: "", active: true },
  { id: "sv63", name: "Coloration INOA sans ammoniaque (L'Oréal)", category: "Beauté — Cheveux", type: "interne", provider: "", price: 150, duration: "", active: true },

  // ── Épilations ──
  { id: "sv64", name: "Épilation Jambes", category: "Beauté — Épilation", type: "interne", provider: "", price: 80, duration: "30min", active: true },
  { id: "sv65", name: "Épilation Demi-jambes", category: "Beauté — Épilation", type: "interne", provider: "", price: 65, duration: "15min", active: true },
  { id: "sv66", name: "Épilation Bras", category: "Beauté — Épilation", type: "interne", provider: "", price: 65, duration: "20min", active: true },
  { id: "sv67", name: "Épilation Visage", category: "Beauté — Épilation", type: "interne", provider: "", price: 50, duration: "20min", active: true },
  { id: "sv68", name: "Épilation Menton", category: "Beauté — Épilation", type: "interne", provider: "", price: 30, duration: "10min", active: true },
  { id: "sv69", name: "Épilation Maillot", category: "Beauté — Épilation", type: "interne", provider: "", price: 35, duration: "20min", active: true },
  { id: "sv70", name: "Épilation Aisselles", category: "Beauté — Épilation", type: "interne", provider: "", price: 35, duration: "20min", active: true },
  { id: "sv71", name: "Épilation Lèvres", category: "Beauté — Épilation", type: "interne", provider: "", price: 15, duration: "10min", active: true },
  { id: "sv72", name: "Épilation Sourcils", category: "Beauté — Épilation", type: "interne", provider: "", price: 20, duration: "20min", active: true },
  { id: "sv73", name: "Épilation Dos ou Ventre", category: "Beauté — Épilation", type: "interne", provider: "", price: 50, duration: "30min", active: true },
  { id: "sv74", name: "Épilation Corps Complet", category: "Beauté — Épilation", type: "interne", provider: "", price: 200, duration: "90min", active: true },

  // ── Journées Oceana (forfaits spa 1 jour) ──
  { id: "sv75", name: "Journée Relax (2 soins)", category: "Spa — Journées Oceana", type: "interne", provider: "", price: 150, duration: "1 jour", active: true },
  { id: "sv76", name: "Journée Relax Plus (2 soins)", category: "Spa — Journées Oceana", type: "interne", provider: "", price: 190, duration: "1 jour", active: true },
  { id: "sv77", name: "Journée Détente (3 soins)", category: "Spa — Journées Oceana", type: "interne", provider: "", price: 220, duration: "1 jour", active: true },
  { id: "sv78", name: "Journée Beauté (3 soins)", category: "Spa — Journées Oceana", type: "interne", provider: "", price: 200, duration: "1 jour", active: true },
  { id: "sv79", name: "Journée Énergie (3 soins)", category: "Spa — Journées Oceana", type: "interne", provider: "", price: 260, duration: "1 jour", active: true },
  { id: "sv80", name: "Journée Orientale (4 soins)", category: "Spa — Journées Oceana", type: "interne", provider: "", price: 290, duration: "1 jour", active: true },

  // ── Escapades Oceana (forfaits spa multi-jours) ──
  { id: "sv81", name: "Escapade Détente (3 jours, 9 soins)", category: "Spa — Escapades Oceana", type: "interne", provider: "", price: 680, duration: "3 jours", active: true },
  { id: "sv82", name: "Escapade Extrême Détente (4 jours, 13 soins)", category: "Spa — Escapades Oceana", type: "interne", provider: "", price: 1050, duration: "4 jours", active: true },
  { id: "sv83", name: "Escapade Extrême Détente (6 jours, 20 soins)", category: "Spa — Escapades Oceana", type: "interne", provider: "", price: 1650, duration: "6 jours", active: true },
  { id: "sv84", name: "Escapade Énergie (3 jours, 9 soins)", category: "Spa — Escapades Oceana", type: "interne", provider: "", price: 800, duration: "3 jours", active: true },
  { id: "sv85", name: "Escapade Minceur (3 jours, 9 soins)", category: "Spa — Escapades Oceana", type: "interne", provider: "", price: 790, duration: "3 jours", active: true },
  { id: "sv86", name: "Escapade Beauté & Silhouette (3 jours, 11 soins)", category: "Spa — Escapades Oceana", type: "interne", provider: "", price: 980, duration: "3 jours", active: true },
  { id: "sv87", name: "Escapade Jambes Légères (3 jours, 11 soins)", category: "Spa — Escapades Oceana", type: "interne", provider: "", price: 820, duration: "3 jours", active: true },
  { id: "sv88", name: "Escapade After Golf (5 jours, 10 soins)", category: "Spa — Escapades Oceana", type: "interne", provider: "", price: 830, duration: "5 jours", active: true },
  { id: "sv89", name: "Escapade Week-end Cool (2 jours, 8 soins)", category: "Spa — Escapades Oceana", type: "interne", provider: "", price: 650, duration: "2 jours", active: true },

  // ── Sport & Loisirs (pas de tarifs publiés côté site — à confirmer avec l'hôtel) ──
  { id: "sv90", name: "Court de Tennis (terre battue)", category: "Sport", type: "interne", provider: "", price: 25, active: true },
  { id: "sv91", name: "Court de Padel (à proximité)", category: "Sport", type: "externe", provider: "", price: 30, active: true },
  { id: "sv92", name: "Planche à voile / Ski nautique / Jet-ski", category: "Sport nautique", type: "externe", provider: "Base nautique Oceana", price: 65, active: true },
  { id: "sv93", name: "Plongée sous-marine (baptême)", category: "Sport nautique", type: "externe", provider: "Centre de plongée partenaire", price: 140, active: true },
  { id: "sv94", name: "Équitation / Randonnée nature", category: "Excursion", type: "externe", provider: "Écurie partenaire Hammamet", price: 90, active: true },
  { id: "sv95", name: "Green Fee Golf 18 trous (à proximité)", category: "Sport", type: "externe", provider: "Golf Club Yasmine Hammamet", price: 220, active: true },
  { id: "sv96", name: "Baby-sitting sur demande", category: "Famille", type: "interne", provider: "", price: 40, active: true },

  // ── Services annexes ──
  { id: "sv97", name: "Room Service", category: "Restauration", type: "interne", provider: "", price: 0, active: true },
  { id: "sv98", name: "Dîner au restaurant à la carte", category: "Restauration", type: "interne", provider: "", price: 75, active: true },
  { id: "sv99", name: "Transfert Aéroport (Tunis / Monastir / Enfidha)", category: "Transport", type: "externe", provider: "Navette Oceana", price: 100, active: true },
  { id: "sv100", name: "Blanchisserie", category: "Divers", type: "interne", provider: "", price: 20, active: true },
];

// Infos pratiques du spa — étiquette, réservation, horaires (source : catalogue officiel)
const OCEANA_SPA_INFO = {
  hours: "Tous les jours de 9h à 19h",
  bookingInternal: "Depuis la chambre : composer le 619 ou le 660",
  bookingExternal: "+216 72 227 227 / +216 98 765 216",
  email: "spa@hoteloceanasuites.com",
  minAge: 16,
  cancellationPolicy: "Annulation ou modification à notifier au moins 2h avant le soin, sous peine de facturation intégrale.",
  arrival: "Arriver au moins 10 minutes avant le rendez-vous.",
};

// Répartition détaillée par catégorie du site officiel — utile pour l'onboarding /
// pour vérifier l'exhaustivité avec l'équipe de l'hôtel avant mise en production.
const OCEANA_RAW_SERVICE_GROUPS = {
  sportLoisirs: ["Planche à voile", "Ski nautique", "Jet-ski", "Plongée", "Équitation", "Vélo", "Visites nature", "Tennis", "Volley-ball", "Beach-volley", "Fitness", "Golf (à proximité)", "Padel (à proximité)", "Aire de jeux"],
  miniClub: ["Mini-club ouvert 7j/7 toute l'année"],
  divers: ["Wi-Fi", "Parking", "Réception 24h/24", "Salles de réunion", "Ascenseur", "Service de change", "Facilités handicapés", "Boutique", "Blanchisserie", "Secrétariat", "Coffre-fort réception"],
  extra: ["Salle de jeux", "Mini bar", "Restaurant à la carte", "Café maure", "Snack piscine", "Bar piscine", "Room service", "Bar plage"],
};

const ROOMS_STATUS = [
  { id: "101", status: "ready" }, { id: "102", status: "cleaning" },
  { id: "103", status: "ready" }, { id: "201", status: "maintenance" },
  { id: "202", status: "ready" }, { id: "312", status: "ready" },
  { id: "408", status: "ready" }, { id: "501", status: "cleaning" },
];

const STAFF_TICKETS = [
  { id: "t1", priority: "HIGH", guest: "Sofia Al-Rashid", room: "501", req: "Réservation Yacht 3h — demain 14h", time: "Il y a 5 min" },
  { id: "t2", priority: "MED", guest: "Jean-Pierre Moreau", room: "312", req: "Oreillers à mémoire de forme x3", time: "Il y a 22 min" },
  { id: "t3", priority: "LOW", guest: "Marcus Steinberg", room: "408", req: "Room Service — Petit-déjeuner 8h00", time: "Il y a 1h" },
];

const MAINTENANCE_TICKETS = [
  { id: "mt1", room: "201", issue: "Climatiseur en panne", brand: "Daikin RXS35K", parts: ["Filtre F1-4K", "Carte PCB-D12"], eta: "2h30", priority: "HIGH" },
  { id: "mt2", room: "115", issue: "Fuite robinet douche", brand: "Hansgrohe Focus", parts: ["Joint EPDM 40mm", "Cartouche céramique"], eta: "45min", priority: "MED" },
];

const ADMIN_HOTELS = [
  { id: "oceana", name: "Oceana Hammamet", guests: 247, mrr: 4892, status: "active", modules: ["checkin", "menu", "spa", "yacht"] },
  { id: "magic", name: "Magic Resort", guests: 189, mrr: 3744, status: "active", modules: ["checkin", "menu", "spa"] },
  { id: "radisson", name: "Radisson Tunis", guests: 0, mrr: 0, status: "pending", modules: ["checkin"] },
];

// ─────────────────────────────────────────────────────────────
// HÔTELS PARTENAIRES — onboarding sans toucher au code
// Stockés en localStorage du navigateur (pas d'équivalent backend pour
// cette liste — local à cet appareil, pas partagé entre le staff) et
// fusionnés à l'exécution avec HOTELS / ADMIN_HOTELS. Voir SuperAdmin >
// section "partners".
// ─────────────────────────────────────────────────────────────
const PARTNER_HOTELS_KEY = "luxepass_partner_hotels";

const makePartnerId = (name) =>
  "p_" + name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "").slice(0, 30) + "_" + Date.now().toString(36);

const EMPTY_PARTNER_HOTEL = {
  name: "", location: "", address: "", phone: "", email: "",
  currency: "TND", currencySymbol: "DT", accent: "#D4AF37",
  image: "", stars: 5, description: "", rooms: 100,
};

// Fabrique un état PMS "neuf" et indépendant (copies fraîches, aucune référence
// partagée) — utilisé pour isoler les données PMS par hôtel (voir appStateByHotel
// dans LuxePassApp). Déclarée comme fonction : safe même si les mocks référencés
// (PMS_GUESTS, ROOMS_STATUS, etc.) sont définis plus bas dans le fichier, car le
// corps n'est évalué qu'à l'appel, jamais au chargement du module.
function createDefaultAppState() {
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
const ROOM_TYPES = [
  { id: "suite_piscine", name: "Suite Vue Piscine (65 m²)", total: 70, baseRate: 300 },
  { id: "suite_jardin", name: "Suite Vue Jardin (65 m²)", total: 78, baseRate: 340 },
  { id: "suite_mer", name: "Suite Vue Mer (65 m²)", total: 60, baseRate: 420 },
];

const CHANNELS = [
  { key: "direct", label: "Direct / Site Web", color: "#34d399" },
  { key: "booking", label: "Booking.com", color: "#003580" },
  { key: "expedia", label: "Expedia", color: "#febb02" },
  { key: "gds", label: "GDS / Agences", color: "#8b5cf6" },
  { key: "group", label: "Groupe / MICE", color: gold },
];

const RESERVATIONS = [
  { id: "res1", guestName: "Karim El Fassi", roomType: "suite_mer", checkIn: "2026-08-22", checkOut: "2026-08-26", channel: "booking", status: "confirmed", rate: 420, pax: 2 },
  { id: "res2", guestName: "Groupe Renault Tunisie (12 pax)", roomType: "suite_jardin", checkIn: "2026-08-25", checkOut: "2026-08-28", channel: "group", status: "confirmed", rate: 300, pax: 12, groupName: "Séminaire Renault" },
  { id: "res3", guestName: "Elena Kowalski", roomType: "suite_mer", checkIn: "2026-08-23", checkOut: "2026-08-30", channel: "direct", status: "confirmed", rate: 420, pax: 2 },
  { id: "res4", guestName: "Ahmed Ben Salah", roomType: "suite_mer", checkIn: "2026-08-24", checkOut: "2026-08-27", channel: "gds", status: "waitlist", rate: 420, pax: 2 },
  { id: "res5", guestName: "Sophie Laurent", roomType: "suite_jardin", checkIn: "2026-08-21", checkOut: "2026-08-23", channel: "expedia", status: "pending", rate: 340, pax: 1 },
];

const YIELD_FACTORS = [
  { key: "occupancy", label: "Taux d'occupation prévu", impact: 8 },
  { key: "weather", label: "Météo favorable (7j)", impact: 3 },
  { key: "event", label: "Festival International Hammamet", impact: 12 },
  { key: "competitor", label: "Tarifs concurrents en hausse", impact: 5 },
  { key: "leadtime", label: "Réservations dernière minute", impact: -4 },
];

// 3. Folio complet & facturation / 8. PCI-DSS tokenisation
const INVOICE_ENTRIES_SAMPLE = [
  { label: "Hébergement (3 nuits)", amount: 1020 },
  { label: "Taxe de séjour (2 pers. × 3 nuits)", amount: 18 },
  { label: "TVA 13%", amount: 134.9 },
];

const PAYMENT_TOKENS = [
  { id: "tok1", guestId: "g1", last4: "4831", brand: "Visa", token: "tok_9f3ac7e21b", preAuth: 500, status: "active" },
  { id: "tok2", guestId: "g2", last4: "2290", brand: "Mastercard", token: "tok_1cd88a04ef", preAuth: 300, status: "active" },
  { id: "tok4", guestId: "g4", last4: "7765", brand: "Amex", token: "tok_77bb21f9c3", preAuth: 800, status: "active" },
];

// 5. Housekeeping avancé
const HOUSEKEEPING_STAFF = ["Amel T.", "Rania K.", "Nabil S.", "Wided B."];
const ROOM_DETAIL_STATUS = {
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
const CRM_PROFILES = [
  { id: "g1", name: "Sofia Al-Rashid", totalStays: 7, hotelsVisited: ["Oceana Hammamet", "Magic Resort"], tier: "Platinum", lifetimeValue: 24800, blacklisted: false, prefs: ["Oreiller ferme", "Étage élevé", "Sans gluten"] },
  { id: "g2", name: "Jean-Pierre Moreau", totalStays: 3, hotelsVisited: ["Oceana Hammamet"], tier: "Gold", lifetimeValue: 8200, blacklisted: false, prefs: ["Chambre calme"] },
  { id: "g3", name: "Amira Benali", totalStays: 1, hotelsVisited: ["Oceana Hammamet"], tier: "Silver", lifetimeValue: 1450, blacklisted: false, prefs: [] },
  { id: "g4", name: "Marcus Steinberg", totalStays: 12, hotelsVisited: ["Oceana Hammamet", "Magic Resort", "Radisson Tunis"], tier: "Black", lifetimeValue: 61200, blacklisted: false, prefs: ["Champagne à l'arrivée", "Late check-out"] },
];

// 9. Reporting
const FORECAST_7D = [
  { day: "Jeu", occ: 82 }, { day: "Ven", occ: 91 }, { day: "Sam", occ: 96 },
  { day: "Dim", occ: 88 }, { day: "Lun", occ: 74 }, { day: "Mar", occ: 69 }, { day: "Mer", occ: 79 },
];

const COMP_SET = [
  { name: "Notre hôtel", adr: 342, revpar: 298 },
  { name: "Four Seasons Tunis", adr: 410, revpar: 350 },
  { name: "Mövenpick Gammarth", adr: 295, revpar: 240 },
  { name: "The Residence Tunis", adr: 380, revpar: 320 },
];

// 10. Serrures électroniques connectées
const SMART_LOCKS = [
  { room: "501", locked: true, battery: 88, lastAccess: "Il y a 12 min — Client (badge digital)" },
  { room: "312", locked: true, battery: 45, lastAccess: "Il y a 2h — Housekeeping" },
  { room: "220", locked: false, battery: 91, lastAccess: "Il y a 5 min — Client (mobile key)" },
  { room: "408", locked: true, battery: 12, lastAccess: "Il y a 1j — Client" },
];

// 11. F&B stock & POS
const FNB_STOCK = [
  { id: "st1", name: "Homard breton", category: "Cuisine", qty: 14, unit: "pièces", threshold: 10 },
  { id: "st2", name: "Champagne Rosé", category: "Bar", qty: 6, unit: "bouteilles", threshold: 8 },
  { id: "st3", name: "Filet de bœuf", category: "Cuisine", qty: 22, unit: "kg", threshold: 10 },
  { id: "st4", name: "Eau minérale 50cl", category: "Room Service", qty: 340, unit: "unités", threshold: 100 },
  { id: "st5", name: "Café Arabica", category: "Bar", qty: 4, unit: "kg", threshold: 5 },
];

// 12. Rôles & permissions & audit trail
// Hiérarchie complète d'un hôtel 5★, organisée par direction/département.
// "modules" référence les clés réelles des onglets PMS (voir allModuleKeys dans RolesAudit).
const STAFF_DEPARTMENTS = [
  "Direction Générale",
  "Hébergement",
  "Restauration (F&B)",
  "Spa & Bien-être",
  "Commercial & Marketing",
  "Finance & Administration",
  "Technique, Sécurité & Support",
  "Transverse",
];

const ALL_PMS_MODULES = ["overview", "services", "police", "checkinout", "reservations", "billing", "nightaudit", "housekeeping2", "crm", "compliance", "reporting", "locks", "fnb", "roles", "noshow", "intelligence", "events", "loyalty", "familysafety", "staffing"];

const STAFF_MEMBERS = [
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
const NOSHOW_RISK = [
  { id: "res1", guestName: "Karim El Fassi", risk: 12, reason: "Historique fiable, carte pré-autorisée" },
  { id: "res4", guestName: "Ahmed Ben Salah", risk: 68, reason: "Réservation GDS sans pré-paiement, 1er séjour" },
  { id: "res5", guestName: "Sophie Laurent", risk: 34, reason: "Réservation dernière minute, canal OTA" },
];

const WAITLIST = [
  { id: "wl1", guestName: "Yassine Trabelsi", roomType: "suite_mer", desiredDate: "2026-08-24", notified: false },
  { id: "wl2", guestName: "Claire Dubosc", roomType: "suite_jardin", desiredDate: "2026-08-22", notified: true },
];

// 17. Maintenance prédictive IoT
const IOT_EQUIPMENT = [
  { id: "eq1", room: "201", equipment: "Climatiseur Daikin RXS35K", health: 34, predictedFailure: "3-5 jours", trend: "down" },
  { id: "eq2", room: "115", equipment: "Chauffe-eau Ariston", health: 58, predictedFailure: "2-3 semaines", trend: "down" },
  { id: "eq3", room: "312", equipment: "Climatiseur Daikin RXS35K", health: 91, predictedFailure: "Stable", trend: "up" },
  { id: "eq4", room: "Piscine", equipment: "Pompe filtration Hayward", health: 47, predictedFailure: "1 semaine", trend: "down" },
];

// 20. Score de durabilité
const SUSTAINABILITY_ROOMS = [
  { room: "501", energyKwh: 18, waterL: 210, score: "A" },
  { room: "312", energyKwh: 31, waterL: 340, score: "B" },
  { room: "220", energyKwh: 42, waterL: 410, score: "C" },
  { room: "408", energyKwh: 22, waterL: 250, score: "A" },
];

// ─────────────────────────────────────────────────────────────
// MODULE 3 — PROACTIVITÉ (météo / vol / événements contextuels)
// ─────────────────────────────────────────────────────────────
const PROACTIVE_EVENTS = [
  { id: "pe1", icon: "weather", fr: "Averses prévues à 16h aujourd'hui. Votre séance Spa de 15h est maintenue en intérieur — voulez-vous avancer votre créneau golf à ce matin ?", en: "Rain expected at 4pm today. Your 3pm Spa session is indoor — want to move your golf slot to this morning?", ar: "أمطار متوقعة الساعة 4 مساءً. جلسة السبا في تمام 3 مساءً داخلية — هل تود تقديم موعد الغولف إلى هذا الصباح؟", cta_fr: "Avancer le golf", cta_en: "Move golf", cta_ar: "تقديم الموعد" },
  { id: "pe2", icon: "flight", fr: "Votre vol TU 0745 (départ après-demain) affiche 20 min de retard prévu. Transfert aéroport ajusté automatiquement à 05h50.", en: "Your flight TU 0745 (departing in 2 days) shows a 20 min expected delay. Airport transfer auto-adjusted to 05:50.", ar: "رحلتك TU 0745 (بعد يومين) تظهر تأخيراً متوقعاً 20 دقيقة. تم تعديل النقل إلى المطار تلقائياً إلى 05:50.", cta_fr: "Voir le transfert", cta_en: "View transfer", cta_ar: "عرض النقل" },
];

// ─────────────────────────────────────────────────────────────
// MODULE 2 — PERSONNALISATION PASSIVE (mémoire apprise du client)
// ─────────────────────────────────────────────────────────────
const INITIAL_MEMORY = [
  { id: "mem1", fr: "Préfère un café allongé servi à 7h chaque matin", en: "Prefers a long black coffee served at 7am daily", ar: "يفضل قهوة أمريكية الساعة 7 صباحاً يومياً" },
  { id: "mem2", fr: "Allergie aux fruits de mer signalée au check-in", en: "Seafood allergy reported at check-in", ar: "حساسية من المأكولات البحرية تم تسجيلها عند تسجيل الوصول" },
  { id: "mem3", fr: "A demandé deux fois des oreillers à mémoire de forme", en: "Requested memory-foam pillows twice", ar: "طلب وسائد ذات ذاكرة الشكل مرتين" },
];

// ─────────────────────────────────────────────────────────────
// MODULE 4 — ORCHESTRATION HORS DES MURS (partenaires externes)
// ─────────────────────────────────────────────────────────────
const EXTERNAL_PARTNERS = [
  { id: "ep1", name: "Dar El Jeld", type_fr: "Restaurant gastronomique — Médina de Tunis", type_en: "Fine dining — Tunis Medina", price: 180 },
  { id: "ep2", name: "El Teatro", type_fr: "Spectacle live & dîner-concert", type_en: "Live show & dinner-concert", price: 95 },
  { id: "ep3", name: "Sidi Bou Saïd — Visite privée", type_fr: "Excursion guidée avec chauffeur", type_en: "Private guided excursion with driver", price: 220 },
];

// ─────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────
function GoldBadge({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}
      style={{ background: "rgba(212,175,55,0.15)", color: gold, border: `1px solid rgba(212,175,55,0.3)` }}>
      {children}
    </span>
  );
}

function GlassCard({ children, className = "", onClick, style = {} }) {
  return (
    <div onClick={onClick}
      className={`rounded-2xl border transition-all duration-300 ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""} ${className}`}
      style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px)", borderColor: "rgba(212,175,55,0.15)", ...style }}>
      {children}
    </div>
  );
}

function GoldButton({ children, onClick, className = "", disabled = false, variant = "primary" }) {
  const base = "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed";
  const variants = {
    primary: `text-black hover:opacity-90 active:scale-95`,
    ghost: `border hover:bg-white/5`,
    danger: `bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30`,
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}
      style={variant === "primary" ? { background: `linear-gradient(135deg, ${gold}, ${goldDark})` } : variant === "ghost" ? { borderColor: "rgba(212,175,55,0.3)", color: gold } : {}}>
      {children}
    </button>
  );
}

function KpiCard({ icon: Icon, label, value, sub, trend }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-xl" style={{ background: "rgba(212,175,55,0.1)" }}>
          <Icon size={20} style={{ color: gold }} />
        </div>
        {trend && <span className={`text-xs font-semibold ${trend > 0 ? "text-emerald-400" : "text-red-400"}`}>
          {trend > 0 ? "+" : ""}{trend}%
        </span>}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-white/50 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </GlassCard>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <GlassCard className="w-full max-w-md p-6 relative" style={{ borderColor: "rgba(212,175,55,0.3)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
          <X size={18} />
        </button>
        {title && <h3 className="text-lg font-bold text-white mb-4">{title}</h3>}
        {children}
      </GlassCard>
    </div>
  );
}

// Fake QR Code SVG
// Vrai QR code (bibliothèque qrcode-generator, niveau de correction M).
// Avant : simple motif décoratif non scannable dérivé du 1er caractère.
// `value` = texte à encoder (voir qrPayload.js) ; `caption` = légende
// optionnelle (ne jamais y mettre le jeton HMAC).
function QRCodeDisplay({ value, caption }) {
  const QUIET = 4; // marge blanche (en modules) exigée par la norme QR
  const { count, path } = useMemo(() => {
    if (!value) return { count: 0, path: "" };
    try {
      const q = qrcode(0, "M"); // 0 = taille (version) choisie automatiquement
      q.addData(String(value));
      q.make();
      const n = q.getModuleCount();
      let d = "";
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
        }
      }
      return { count: n, path: d };
    } catch {
      return { count: 0, path: "" }; // contenu trop long pour un QR
    }
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="p-3 rounded-2xl bg-white">
        {count > 0 ? (
          <svg width={176} height={176} viewBox={`${-QUIET} ${-QUIET} ${count + 2 * QUIET} ${count + 2 * QUIET}`}
            shapeRendering="crispEdges" role="img" aria-label="QR code du pass de séjour">
            <path d={path} fill="#0a0a0a" />
          </svg>
        ) : (
          <div className="flex items-center justify-center text-xs text-black/50" style={{ width: 176, height: 176 }}>
            QR indisponible
          </div>
        )}
      </div>
      {caption && <p className="text-xs text-white/40 font-mono">{caption}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SIGNATURE CANVAS
// ─────────────────────────────────────────────────────────────
function SignatureCanvas({ onSave, t }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [signed, setSigned] = useState(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const start = (e) => {
    drawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setSigned(false);
  };

  const draw = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = gold;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stop = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
  };

  const save = () => {
    const data = canvasRef.current.toDataURL("image/png");
    onSave(data);
    setSigned(true);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-white/50 text-sm">{t.signHere}</p>
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: "rgba(212,175,55,0.3)", background: "rgba(255,255,255,0.03)" }}>
        <canvas ref={canvasRef} width={340} height={160}
          onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={stop}
          className="cursor-crosshair block" />
      </div>
      <div className="flex gap-3">
        <GoldButton onClick={clear} variant="ghost">{t.clearSig}</GoldButton>
        <GoldButton onClick={save}>
          {signed ? <><Check size={16} /> {t.confirmSig}</> : t.confirmSig}
        </GoldButton>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CREDIT CARD DISPLAY
// ─────────────────────────────────────────────────────────────
function PremiumCard({ number, holder, expiry }) {
  const fmt = (n) => n.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim() || "•••• •••• •••• ••••";
  return (
    <div className="relative w-80 h-48 rounded-2xl overflow-hidden shadow-2xl select-none"
      style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(212,175,55,0.2), transparent 60%)" }} />
      <div className="absolute top-4 right-4 w-12 h-8 rounded-md" style={{ background: "linear-gradient(135deg, #D4AF37, #8B6914)", opacity: 0.9 }} />
      <div className="absolute bottom-6 left-6 right-6">
        <p className="font-mono text-white/90 text-lg tracking-widest mb-3">{fmt(number)}</p>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wider">Titulaire</p>
            <p className="text-white font-medium text-sm">{holder || "VOTRE NOM"}</p>
          </div>
          <div className="text-right">
            <p className="text-white/40 text-xs uppercase tracking-wider">Expire</p>
            <p className="text-white font-medium text-sm">{expiry || "MM/YY"}</p>
          </div>
        </div>
      </div>
      <div className="absolute top-4 left-6">
        <div className="flex gap-1">
          <div className="w-8 h-8 rounded-full" style={{ background: gold, opacity: 0.8 }} />
          <div className="w-8 h-8 rounded-full -ml-4" style={{ background: "#C0392B", opacity: 0.6 }} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CHECK-IN MODULE
// ─────────────────────────────────────────────────────────────
// Détection sommaire de la marque de carte à partir du BIN — purement
// indicative pour l'affichage, ne remplace pas la détection faite par le PSP.
const detectCardBrand = (rawNumber) => {
  const n = (rawNumber || "").replace(/\s/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  return "Other";
};

function CheckInFlow({ t, hotel, onComplete, appState, setAppState }) {
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
  const fileRef = useRef(null);

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
  // Normalise vers ce qu'attend le backend, indépendamment de la locale/du
  // format saisi ou extrait par l'OCR (ex: "H" pour Homme, dates JJ-MM-AAAA
  // — conventions courantes sur les CIN tunisiennes — alors que le schéma
  // backend exige l'enum M/F/X et le format ISO AAAA-MM-JJ).
  const normalizeGender = (g) => {
    const v = (g || "").trim().toUpperCase();
    if (["H", "M", "HOMME", "MALE"].includes(v)) return "M";
    if (["F", "FEMME", "FEMALE"].includes(v)) return "F";
    return "X";
  };
  const normalizeDate = (d) => {
    const v = (d || "").trim();
    const m = v.match(/^(\d{2})-(\d{2})-(\d{4})$/); // JJ-MM-AAAA -> AAAA-MM-JJ
    return m ? `${m[3]}-${m[2]}-${m[1]}` : v;
  };

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

  const fieldClass = "w-full bg-white/5 border rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 transition-all";
  const fieldStyle = { borderColor: "rgba(212,175,55,0.2)" };
  const focusStyle = { "--tw-ring-color": gold };

  const steps = [t.step1, t.step2, t.step3];

  // Session pas encore prête : on bloque l'écran plutôt que de laisser
  // l'utilisateur avancer sans sessionToken valide.
  if (initializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#080808" }}>
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: gold, borderTopColor: "transparent" }} />
        <p className="text-white/50 text-sm">Connexion à l'hôtel…</p>
      </div>
    );
  }
  if (initError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: "#080808" }}>
        <AlertTriangle size={32} className="text-red-400" />
        <p className="text-white/70 text-sm">{initError}</p>
        <GoldButton onClick={() => window.location.reload()}>Réessayer</GoldButton>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: "linear-gradient(135deg, #080808 0%, #0f0f0f 100%)" }}>
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <GoldBadge><Star size={12} />{hotel.name}</GoldBadge>
          <h2 className="text-2xl font-bold text-white mt-3">{t.checkIn}</h2>
        </div>

        {/* Step progress */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                  style={i < step ? { background: gold, color: "#000" } : i === step ? { background: "rgba(212,175,55,0.2)", color: gold, border: `2px solid ${gold}` } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", border: "2px solid rgba(255,255,255,0.1)" }}>
                  {i < step ? <Check size={16} /> : i + 1}
                </div>
                <span className="text-xs text-white/40 text-center w-20">{s}</span>
              </div>
              {i < 2 && <div className="flex-1 h-px mx-2" style={{ background: i < step ? gold : "rgba(255,255,255,0.1)" }} />}
            </div>
          ))}
        </div>

        <GlassCard className="p-6" style={{ borderColor: "rgba(212,175,55,0.2)" }}>

          {/* STEP 0: ID SCAN */}
          {step === 0 && (
            <div className="space-y-5">
              {!scanned ? (
                <div>
                  <div onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-opacity-60 transition-all"
                    style={{ borderColor: "rgba(212,175,55,0.3)", background: "rgba(212,175,55,0.03)" }}>
                    <input ref={fileRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileSelected} />
                    {scanning ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: gold, borderTopColor: "transparent" }} />
                        <p className="text-sm font-medium" style={{ color: gold }}>{t.analyzing}</p>
                        <div className="w-full space-y-2">
                          {[80, 60, 90, 50].map((w, i) => (
                            <div key={i} className="h-3 rounded-full animate-pulse" style={{ background: "rgba(212,175,55,0.15)", width: `${w}%` }} />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload size={36} style={{ color: gold }} />
                        <p className="text-white font-medium">{t.upload}</p>
                        <p className="text-white/40 text-xs text-center">{t.uploadSub}</p>
                      </>
                    )}
                  </div>
                  {scanError && (
                    <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                      <AlertTriangle size={12} />{scanError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                    <Check size={16} className="text-emerald-400" />{t.extracted}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "firstName", label: t.firstName }, { key: "lastName", label: t.lastName },
                      { key: "age", label: t.age }, { key: "gender", label: t.gender },
                      { key: "idNumber", label: t.idNumber }, { key: "profession", label: t.profession },
                      { key: "from", label: t.from }, { key: "destination", label: t.destination },
                      { key: "arrival", label: t.arrival }, { key: "departure", label: t.departure },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-xs text-white/40 mb-1">{label}</label>
                        <div className="relative">
                          <input value={guestData[key]} onChange={e => setGuestData(p => ({ ...p, [key]: e.target.value }))}
                            className={fieldClass} style={fieldStyle} />
                          <Check size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                        </div>
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs text-white/40 mb-1">{t.occupants}</label>
                      <input type="number" min={1} max={10} value={guestData.occupants}
                        onChange={e => setGuestData(p => ({ ...p, occupants: Math.max(1, Math.min(10, Number(e.target.value) || 1)) }))}
                        className={fieldClass} style={fieldStyle} />
                    </div>
                  </div>
                  {guestDataError && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertTriangle size={12} />{guestDataError}
                    </p>
                  )}
                  <GoldButton onClick={handleConfirmGuestData} disabled={submitting} className="w-full">
                    {submitting ? "Validation..." : <>{t.next} <ChevronRight size={16} /></>}
                  </GoldButton>
                </div>
              )}
            </div>
          )}

          {/* STEP 1: SIGNATURE */}
          {step === 1 && (
            <div className="space-y-5">
              <SignatureCanvas t={t} onSave={(data) => setSignature(data)} />
              {signatureError && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle size={12} />{signatureError}
                </p>
              )}
              <div className="flex gap-3">
                <GoldButton variant="ghost" onClick={() => setStep(0)}><ChevronLeft size={16} />{t.back}</GoldButton>
                <GoldButton className="flex-1" disabled={!signature || submitting} onClick={handleConfirmSignature}>
                  {submitting ? "Validation..." : <>{t.next} <ChevronRight size={16} /></>}
                </GoldButton>
              </div>
            </div>
          )}

          {/* STEP 2: PAYMENT */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Forfait Conciergerie & Bien-être — pré-coché, prix toujours
                  visible juste à côté (jamais seulement sur le folio après coup) */}
              {!qrPayload && (() => {
                const { nights, pax, total } = computeConciergePrice(guestData.arrival, guestData.departure, guestData.occupants);
                return (
                  <label className="flex items-start gap-3 p-3 rounded-xl cursor-pointer" style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)" }}>
                    <input type="checkbox" checked={conciergeOptIn} onChange={e => setConciergeOptIn(e.target.checked)} className="mt-0.5 flex-shrink-0" style={{ accentColor: gold }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-white text-sm font-medium">{t.conciergeAddonName}</p>
                        <p className="text-sm font-bold flex-shrink-0" style={{ color: gold }}>{total} {hotel.currencySymbol}</p>
                      </div>
                      <p className="text-white/40 text-xs mt-0.5">{t.conciergeAddonDesc}</p>
                      <p className="text-white/30 text-[10px] mt-1">{CONCIERGE_PACKAGE.pricePerNightPerPerson} {hotel.currencySymbol} × {nights} {nights > 1 ? t.nights : t.night} × {pax} {pax > 1 ? t.occupantsShort : t.occupantShort}</p>
                    </div>
                  </label>
                );
              })()}

              <div className="flex justify-center">
                <PremiumCard number={card.number} holder={card.holder} expiry={card.expiry} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-white/40 mb-1">{t.cardNumber}</label>
                  <input value={card.number} maxLength={19}
                    onChange={e => setCard(p => ({ ...p, number: e.target.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim() }))}
                    placeholder="1234 5678 9012 3456" className={fieldClass} style={fieldStyle} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-white/40 mb-1">{t.cardHolder}</label>
                  <input value={card.holder} onChange={e => setCard(p => ({ ...p, holder: e.target.value }))}
                    placeholder="NOM PRÉNOM" className={fieldClass} style={fieldStyle} />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1">{t.expiry}</label>
                  <input value={card.expiry} maxLength={5}
                    onChange={e => setCard(p => ({ ...p, expiry: e.target.value.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1/$2") }))}
                    placeholder="MM/YY" className={fieldClass} style={fieldStyle} />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1">{t.cvv}</label>
                  <input value={card.cvv} maxLength={3} type="password"
                    onChange={e => setCard(p => ({ ...p, cvv: e.target.value.replace(/\D/g, "") }))}
                    placeholder="•••" className={fieldClass} style={fieldStyle} />
                </div>
              </div>

              {paymentError && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle size={12} />{paymentError}
                </p>
              )}
              {!qrPayload ? (
                <GoldButton className="w-full" onClick={generateQR} disabled={card.number.length < 19 || submitting}>
                  <QrCode size={16} /> {submitting ? "Traitement..." : t.generateQR}
                </GoldButton>
              ) : (
                <div className="space-y-4">
                  <QRCodeDisplay value={qrPayload} caption={stayId ? `#${stayId.slice(-6)}` : undefined} />
                  {conciergeAdded && (
                    <p className="text-xs text-center flex items-center justify-center gap-1.5" style={{ color: gold }}>
                      <Check size={12} />{t.conciergeAddonName} — {conciergeAdded} {hotel.currencySymbol} {t.conciergeAddonAdded}
                    </p>
                  )}
                  <GoldButton className="w-full" onClick={onComplete}>
                    <Check size={16} /> {t.finish}
                  </GoldButton>
                </div>
              )}
              <GoldButton variant="ghost" onClick={() => setStep(1)}><ChevronLeft size={16} />{t.back}</GoldButton>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BUTLER RECOMMENDATION
// ─────────────────────────────────────────────────────────────
function ButlerRecommendation({ guest, t }) {
  const [collapsed, setCollapsed] = useState(false);
  const [everExpanded, setEverExpanded] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setCollapsed(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  if (!guest) return null;
  const messages = [];
  const age = parseInt(guest.age);
  const origin = (guest.from || "").toLowerCase();
  const prof = (guest.profession || "").toLowerCase();
  const isLongHaul = origin.includes("dubaï") || origin.includes("dubai") || origin.includes("usa") || origin.includes("canada") || origin.includes("asie") || origin.includes("japon");
  const isYoung = age > 0 && age < 35;
  const isExec = prof.includes("directeur") || prof.includes("architecte") || prof.includes("ceo") || prof.includes("manager") || prof.includes("conseil");

  if (isLongHaul) messages.push({ icon: "✈️", text: t.dir === "rtl" ? "لاحظنا قدومك من رحلة طويلة. نوصيك بجلسة سبا مريحة أو كوكتيل ترحيبي في غرفتك." : "Nous avons détecté un long vol. Notre Spa vous attend pour une décompression royale, ou souhaitez-vous un cocktail de bienvenue en chambre ?" });
  if (isYoung) messages.push({ icon: "🎾", text: t.dir === "rtl" ? "استمتع بمرافق التنس والبادل الاحترافية لدينا — متاحة الآن!" : "Profitez de nos courts de Tennis & Padel flambant neufs — réservation prioritaire disponible !" });
  if (isExec) messages.push({ icon: "⛳", text: t.dir === "rtl" ? "يُوصى لك بجولة غولف حصرية أو الوصول إلى صالة الأعمال الفاخرة." : "En tant que profil exécutif, nous vous recommandons notre parcours de Golf privé ou l'accès à notre Business Lounge." });
  if (!messages.length) messages.push({ icon: "🌟", text: t.dir === "rtl" ? "مرحباً بك! فريقنا في خدمتك على مدار الساعة." : "Bienvenue ! Notre équipe est à votre disposition 24h/24." });

  if (collapsed) {
    return (
      <button onClick={() => { setCollapsed(false); setEverExpanded(true); }}
        className="flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 animate-in fade-in"
        style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)" }}>
        <BrainCircuit size={14} style={{ color: gold }} />
        <span className="text-xs text-white/60">{t.virtualButler}</span>
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: gold }} />
      </button>
    );
  }

  return (
    <GlassCard className="p-5 space-y-3 transition-all duration-300" style={{ borderColor: "rgba(212,175,55,0.25)", background: "rgba(212,175,55,0.04)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BrainCircuit size={18} style={{ color: gold }} />
          <span className="text-sm font-semibold text-white">{t.virtualButler}</span>
          <GoldBadge><Zap size={10} />IA</GoldBadge>
        </div>
        {everExpanded && (
          <button onClick={() => setCollapsed(true)} className="p-1 rounded-lg text-white/30 hover:text-white/60 transition-colors">
            <ChevronDown size={16} />
          </button>
        )}
      </div>
      {messages.map((m, i) => (
        <div key={i} className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
          <span className="text-xl">{m.icon}</span>
          <p className="text-sm text-white/80 leading-relaxed">{m.text}</p>
        </div>
      ))}
    </GlassCard>
  );
}

// ─────────────────────────────────────────────────────────────
// MODULE 3 — ALERTES PROACTIVES (météo, vol, événements)
// ─────────────────────────────────────────────────────────────
function ProactiveAlerts({ t, lang }) {
  const [dismissed, setDismissed] = useState([]);
  const visible = PROACTIVE_EVENTS.filter(e => !dismissed.includes(e.id));
  if (!visible.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Zap size={14} style={{ color: gold }} />
        <span className="text-xs font-semibold uppercase tracking-wider text-white/50">{t.proactiveTitle}</span>
      </div>
      {visible.map(ev => (
        <GlassCard key={ev.id} className="p-4 flex items-start gap-3" style={{ borderColor: "rgba(212,175,55,0.2)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,175,55,0.1)" }}>
            {ev.icon === "weather" ? <Cloud size={16} style={{ color: gold }} /> : <Plane size={16} style={{ color: gold }} />}
          </div>
          <div className="flex-1">
            <p className="text-sm text-white/80 leading-relaxed">{ev[lang] || ev.fr}</p>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={() => setDismissed(p => [...p, ev.id])}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "rgba(212,175,55,0.15)", color: gold }}>
                {ev[`cta_${lang}`] || ev.cta_fr}
              </button>
              <button onClick={() => setDismissed(p => [...p, ev.id])} className="text-xs text-white/30 px-2">
                <X size={12} />
              </button>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODULE 6 — TRANSPARENCE & CONTRÔLE (mémoire IA)
// ─────────────────────────────────────────────────────────────
function MemoryModal({ open, onClose, t, lang, memory, onClear }) {
  return (
    <Modal open={open} onClose={onClose} title={t.memoryTitle}>
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck size={14} style={{ color: gold }} />
        <p className="text-xs text-white/40">{t.privacyNote}</p>
      </div>
      <p className="text-xs uppercase tracking-wider text-white/40 mb-2">{t.learnedPrefs}</p>
      {memory.length === 0 ? (
        <p className="text-sm text-white/50 py-4 text-center">{t.noPrefsYet}</p>
      ) : (
        <div className="space-y-2 mb-4">
          {memory.map(m => (
            <div key={m.id} className="flex items-start gap-2 bg-white/5 rounded-xl p-3">
              <Eye size={13} style={{ color: gold }} className="mt-0.5 flex-shrink-0" />
              <p className="text-xs text-white/70 leading-relaxed">{m[lang] || m.fr}</p>
            </div>
          ))}
        </div>
      )}
      <GoldButton variant="ghost" className="w-full" onClick={onClear}>
        <Trash2 size={14} /> {t.clearMemory}
      </GoldButton>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// MODULE 4 — ORCHESTRATION HORS DES MURS (partenaires externes + itinéraire IA)
// ─────────────────────────────────────────────────────────────
function ExploreCityModal({ open, onClose, t, lang, hotel, onBooked }) {
  return (
    <Modal open={open} onClose={onClose} title={t.externalPartners}>
      <div className="space-y-2">
        {EXTERNAL_PARTNERS.map(p => (
          <GlassCard key={p.id} className="p-3 flex items-center justify-between gap-3">
            <div className="flex-1">
              <p className="text-white text-sm font-medium">{p.name}</p>
              <p className="text-white/40 text-xs">{lang === "en" ? p.type_en : p.type_fr}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-bold mb-1" style={{ color: gold }}>{p.price} {hotel.currencySymbol}</p>
              <button onClick={() => onBooked(p)} className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: "rgba(212,175,55,0.2)", color: gold }}>
                {t.reserve}
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
    </Modal>
  );
}

function buildItinerary(guest, lang) {
  const age = parseInt(guest?.age) || 0;
  const prof = (guest?.profession || "").toLowerCase();
  const isExec = prof.includes("directeur") || prof.includes("architecte") || prof.includes("ceo") || prof.includes("manager");
  const days = [];
  const L = (fr, en, ar) => (lang === "en" ? en : lang === "ar" ? ar : fr);
  days.push(L("Matin : petit-déjeuner en terrasse + Spa décompression", "Morning: terrace breakfast + decompression Spa", "الصباح: فطور على التراس + سبا للاسترخاء"));
  days.push(isExec
    ? L("Après-midi : accès Business Lounge + 18 trous de Golf privé", "Afternoon: Business Lounge access + private 18-hole Golf", "بعد الظهر: صالة أعمال + 18 حفرة غولف خاصة")
    : age < 35
      ? L("Après-midi : Tennis / Padel puis balade à Sidi Bou Saïd", "Afternoon: Tennis / Padel then a Sidi Bou Saïd walk", "بعد الظهر: تنس/بادل ثم جولة في سيدي بو سعيد")
      : L("Après-midi : visite guidée de la Médina de Tunis", "Afternoon: guided Tunis Medina tour", "بعد الظهر: جولة مرشدة في مدينة تونس"));
  days.push(L("Soir : dîner gastronomique à Dar El Jeld, transfert privé inclus", "Evening: fine dining at Dar El Jeld, private transfer included", "المساء: عشاء فاخر في دار الجلد مع نقل خاص"));
  return days;
}

// ─────────────────────────────────────────────────────────────
// MODULE 1 & 5 — CONCIERGE CHAT (mémoire conversationnelle + handoff humain)
// ─────────────────────────────────────────────────────────────
function ConciergeChat({ t, guest, hotel, lang, memory, onMemoryNote, pushTicket }) {
  const [messages, setMessages] = useState([
    { from: "ai", text: `${t.welcome} ${guest?.firstName || ""}. ${t.dir === "rtl" ? "أنا كونسيرجك الذكي، تحت تصرفك." : "Je suis votre concierge IA, à votre disposition."}` },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [handoff, setHandoff] = useState("none"); // none | transferring | connected
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [itinerary, setItinerary] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  // Phase 1 — appel réel au concierge IA (routes/concierge.routes.ts +
  // services/ai.service.ts côté backend). Remplace les anciennes réponses
  // scriptées : c'est le backend qui décide du sentiment, de ce qui doit
  // être mémorisé (personnalisation) et de ce qui doit devenir un ticket
  // staff (priorisation intelligente des demandes).
  //
  // guest.stayId est l'identifiant du séjour (voir CheckInFlow.generateQR()). Sans lui
  // (ex: aperçu staff/démo sans check-in réel), on retombe directement en
  // mode dégradé local sans tenter l'appel réseau.
  const respond = async (userText) => {
    setTyping(true);
    if (!guest?.stayId) {
      setTimeout(() => {
        setTyping(false);
        setMessages(p => [...p, { from: "ai", text: t.dir === "rtl" ? "تم التوصيل لفريقنا، وسنعود إليك خلال دقائق." : "C'est transmis à notre équipe, je reviens vers vous dans quelques minutes." }]);
        pushTicket(userText, "LOW");
      }, 900);
      return;
    }
    try {
      const result = await conciergeApi.sendMessage(guest.stayId, userText, lang);
      setTyping(false);
      setMessages(p => [...p, { from: "ai", text: result.reply }]);
      // La note mémoire et le ticket éventuels sont déjà persistés côté
      // backend (notesStore / serviceRequestsStore) — ici on met juste à
      // jour l'affichage local, sans appel réseau supplémentaire.
      if (result.memoryNote) {
        onMemoryNote?.({ id: `mem_${Date.now()}`, fr: result.memoryNote, en: result.memoryNote, ar: result.memoryNote, backendSynced: true });
      }
      if (result.ticketCreated) {
        setMessages(p => [...p, { from: "system", text: t.dir === "rtl" ? "تم إنشاء طلب لفريقنا." : "Une demande a été transmise à notre équipe." }]);
      }
      if (result.escalateToHuman && handoff === "none") {
        startHandoff();
      }
    } catch (err) {
      setTyping(false);
      const message = err instanceof ApiError ? err.message : (t.dir === "rtl" ? "تعذر الاتصال بالخادم." : "Impossible de contacter le serveur.");
      setMessages(p => [...p, { from: "system", text: message }]);
    }
  };

  const send = () => {
    if (!input.trim()) return;
    setMessages(p => [...p, { from: "user", text: input }]);
    respond(input);
    setInput("");
  };

  const startHandoff = () => {
    setHandoff("transferring");
    setMessages(p => [...p, { from: "system", text: t.transferring }]);
    pushTicket(t.talkHuman, "HIGH");
    setTimeout(() => {
      setHandoff("connected");
      setMessages(p => [...p, { from: "human", text: t.humanConnected }]);
    }, 1800);
  };

  const generateItinerary = () => setItinerary(buildItinerary(guest, lang));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2"><MessageSquare size={16} style={{ color: gold }} />{t.concierge}</h3>
        <GoldBadge><BrainCircuit size={10} />IA</GoldBadge>
      </div>

      {/* Quick actions — modules 4, 5, 6 */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setMemoryOpen(true)} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(212,175,55,0.15)" }}>
          <Eye size={12} /> {t.viewMemory}
        </button>
        <button onClick={() => setExploreOpen(true)} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(212,175,55,0.15)" }}>
          <MapPin size={12} /> {t.exploreCity}
        </button>
        <button onClick={generateItinerary} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(212,175,55,0.15)" }}>
          <Sparkles size={12} /> {t.generateItinerary}
        </button>
        {handoff === "none" && (
          <button onClick={startHandoff} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(212,175,55,0.15)" }}>
            <User size={12} /> {t.talkHuman}
          </button>
        )}
      </div>

      {itinerary && (
        <GlassCard className="p-4 space-y-2" style={{ borderColor: "rgba(212,175,55,0.25)" }}>
          <p className="text-sm font-semibold text-white flex items-center gap-2"><Sparkles size={14} style={{ color: gold }} />{t.itineraryFor}</p>
          {itinerary.map((step, i) => (
            <p key={i} className="text-xs text-white/70 leading-relaxed pl-3 border-l" style={{ borderColor: "rgba(212,175,55,0.3)" }}>{step}</p>
          ))}
        </GlassCard>
      )}

      {/* Chat window */}
      <GlassCard className="p-4">
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
              {m.from === "system" ? (
                <p className="text-xs text-white/30 italic text-center w-full">{m.text}</p>
              ) : (
                <div className="max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                  style={m.from === "user"
                    ? { background: gold, color: "#000" }
                    : m.from === "human"
                      ? { background: "rgba(16,185,129,0.15)", color: "#e5fff5", border: "1px solid rgba(16,185,129,0.3)" }
                      : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.85)" }}>
                  {m.from === "human" && <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 mb-1"><User size={10} />{t.talkHuman}</span>}
                  {m.text}
                </div>
              )}
            </div>
          ))}
          {typing && <p className="text-xs text-white/30 italic">{t.aiTyping}</p>}
          <div ref={scrollRef} />
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: "rgba(212,175,55,0.1)" }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
            placeholder={t.chatPlaceholder}
            className="flex-1 bg-white/5 border rounded-xl px-3.5 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none"
            style={{ borderColor: "rgba(212,175,55,0.2)" }} />
          <button onClick={send} className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: gold, color: "#000" }}>
            <Send size={15} />
          </button>
        </div>
      </GlassCard>

      <MemoryModal open={memoryOpen} onClose={() => setMemoryOpen(false)} t={t} lang={lang} memory={memory}
        onClear={() => { clearMemory(); setMemoryOpen(false); setMessages(p => [...p, { from: "system", text: t.dataCleared }]); }} />
      <ExploreCityModal open={exploreOpen} onClose={() => setExploreOpen(false)} t={t} lang={lang} hotel={hotel}
        onBooked={(p) => { setExploreOpen(false); setMessages(m => [...m, { from: "system", text: `✓ ${p.name} — ${t.confirm}` }]); pushTicket(`${t.exploreCity} : ${p.name}`, "MED"); }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CLIENT DASHBOARD
// ─────────────────────────────────────────────────────────────
function ClientDashboard({ t, guest, hotel, lang, appState, setAppState, onLeaveStay }) {
  const [activeTab, setActiveTab] = useState("home");
  const [cart, setCart] = useState([]);
  const [modal, setModal] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [incidentText, setIncidentText] = useState("");
  const [incidentAnalyzing, setIncidentAnalyzing] = useState(false);
  const [incidentReport, setIncidentReport] = useState(null);
  const [incidentType, setIncidentType] = useState(null);
  const [incidentPhoto, setIncidentPhoto] = useState(null);
  const [micListening, setMicListening] = useState(false);
  const incidentPhotoRef = useRef(null);
  const recognitionRef = useRef(null);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [qrPayModal, setQrPayModal] = useState(false);
  const [checkedOut, setCheckedOut] = useState(false);
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
  // ── État générique pour les autres actions branchées au backend
  // (demande de service, checkout) — indépendant de orderSubmitting/orderError
  // pour ne pas mélanger les messages entre le panier et ces actions.
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  const refreshFolio = useCallback(() => {
    if (!guest?.stayId) return;
    ordersApi.list(guest.stayId).then(setFolio).catch(() => {});
  }, [guest?.stayId]);

  useEffect(() => { refreshFolio(); }, [refreshFolio]);

  // ── Suivi de mes demandes (réclamations + demandes de service) ──
  // Le backend sait déjà changer le statut (pending → in_progress → done)
  // côté staff (pms.routes.ts) ; jusqu'ici le client ne relisait jamais ce
  // statut. On l'affiche ici et on le rafraîchit périodiquement pour un
  // suivi quasi temps réel (mêmes principes que refreshPmsData côté staff).
  const [myRequests, setMyRequests] = useState({ requests: [], reports: [] });

  const refreshMyRequests = useCallback(() => {
    if (!guest?.stayId) return;
    Promise.all([
      stayApi.listServiceRequests(guest.stayId).catch(() => ({ requests: [] })),
      stayApi.listMaintenanceReports(guest.stayId).catch(() => ({ reports: [] })),
    ]).then(([sr, mr]) => setMyRequests({ requests: sr.requests || [], reports: mr.reports || [] }));
  }, [guest?.stayId]);

  useEffect(() => {
    refreshMyRequests();
    const interval = setInterval(refreshMyRequests, 8000);
    return () => clearInterval(interval);
  }, [refreshMyRequests]);

  const guestId = guest?.guestId;
  const room = guest?.room || (guest?.hotel?.id === "oceana" ? "501" : "312");

  // Mémoire IA partagée avec le PMS (Guest 360) — modules 2 & 6 branchés sur appState
  const memory = (appState?.memories && appState.memories[guestId]) || INITIAL_MEMORY;
  const setMemory = (updater) => setAppState(prev => {
    const current = (prev.memories && prev.memories[guestId]) || INITIAL_MEMORY;
    const next = typeof updater === "function" ? updater(current) : updater;
    return { ...prev, memories: { ...prev.memories, [guestId]: next } };
  });

  // Ajoute une note à la mémoire concierge — synchro locale (affichage
  // multilingue du chatbot demo) + sauvegarde réelle côté backend.
  const addMemoryNote = (entry) => {
    setMemory(p => [...p, entry]);
    // backendSynced: true = la note vient déjà d'être persistée côté serveur
    // (ex: memoryNote renvoyé par POST /stays/:stayId/concierge/messages) —
    // on ne la réécrit pas une deuxième fois pour éviter un doublon.
    if (guest?.stayId && !entry.backendSynced) stayApi.addNote(guest.stayId, entry.fr).catch(() => {});
  };

  // Réhydratation de la mémoire depuis le backend au chargement — jusqu'ici
  // stayApi.addNote() écrivait bien côté serveur mais rien ne relisait
  // jamais stayApi.listNotes(), donc un rechargement de page (ou une
  // ouverture depuis un autre appareil) perdait l'affichage des
  // préférences pourtant toujours en base. Les notes backend n'ont qu'un
  // texte en français (pas de fr/en/ar séparés) — on réutilise ce même
  // texte pour les trois clés, cohérent avec le fallback m[lang] || m.fr
  // déjà utilisé partout où `memory` est affichée.
  useEffect(() => {
    if (!guest?.stayId) return;
    let cancelled = false;
    stayApi.listNotes(guest.stayId)
      .then((res) => {
        if (cancelled) return;
        const notes = (res.notes || []).map(n => ({ id: n.id, fr: n.text, en: n.text, ar: n.text }));
        setAppState(prev => ({ ...prev, memories: { ...prev.memories, [guestId]: notes } }));
      })
      .catch(() => {}); // pas de mémoire backend disponible — on garde l'état local existant
    return () => { cancelled = true; };
  }, [guest?.stayId]);

  const clearMemory = () => {
    setMemory([]);
    if (guest?.stayId) stayApi.clearNotes(guest.stayId).catch(() => {});
  };

  // Événements temps réel poussés vers le PMS + backend réel
  const pushTicket = async (req, priority = "MED", price = 0) => {
    setAppState(prev => ({
      ...prev,
      liveTickets: [{ id: `lt_${Date.now()}`, guestId, guest: `${guest?.firstName} ${guest?.lastName}`, room, req, priority, time: "À l'instant", live: true }, ...(prev.liveTickets || [])],
    }));
    if (!guest?.stayId) return;
    setActionError(null);
    try {
      await stayApi.requestService(guest.stayId, req, priority, price);
      refreshMyRequests();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Erreur réseau, veuillez réessayer");
    }
  };

  const pushOrder = (items, total) => setAppState(prev => ({
    ...prev,
    liveOrders: [{ id: `lo_${Date.now()}`, guestId, guest: `${guest?.firstName} ${guest?.lastName}`, room, items, total, time: "À l'instant", status: "En préparation" }, ...(prev.liveOrders || [])],
    folios: { ...prev.folios, [guestId]: (prev.folios?.[guestId] || 0) + total },
  }));

  const pushMaintenance = async (report) => {
    setAppState(prev => ({
      ...prev,
      liveMaintenance: [{ id: `lm_${Date.now()}`, guestId, room, issue: report.issue, brand: report.equipment, parts: [], eta: "2h30", priority: "HIGH", ticket: report.ticket, live: true }, ...(prev.liveMaintenance || [])],
    }));
    if (!guest?.stayId) return;
    setActionError(null);
    try {
      await stayApi.reportMaintenance(guest.stayId, report.issue, report.equipment);
      refreshMyRequests();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Erreur réseau, veuillez réessayer");
    }
  };

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

  const ISSUE_REPORTS = {
    ac: { icon: Snowflake, equipment: `Climatiseur — Chambre ${room}`, issue: "Panne détectée : Compresseur défaillant (Code E7)", eta: "2h30" },
    wifi: { icon: Wifi, equipment: `Réseau Wifi — Chambre ${room}`, issue: "Signal faible détecté sur le point d'accès le plus proche", eta: "30 min" },
    plumbing: { icon: Droplets, equipment: `Salle de bain — Chambre ${room}`, issue: "Fuite ou obstruction signalée", eta: "1h" },
    elec: { icon: Zap, equipment: `Installation électrique / TV — Chambre ${room}`, issue: "Anomalie électrique ou TV signalée", eta: "1h" },
    cleaning: { icon: Sparkles, equipment: `Chambre ${room}`, issue: "Ménage supplémentaire demandé", eta: "45 min" },
    other: { icon: Wrench, equipment: `Chambre ${room}`, issue: incidentText || "Problème signalé par le client", eta: "1h" },
  };

  const analyzeIncident = (type = "other") => {
    setIncidentType(type);
    setIncidentAnalyzing(true);
    setTimeout(() => {
      setIncidentAnalyzing(false);
      const base = ISSUE_REPORTS[type] || ISSUE_REPORTS.other;
      const report = {
        equipment: base.equipment,
        issue: base.issue,
        solution: `Intervention technicien en cours — ${t.etaLabel} : ${base.eta}`,
        ticket: `INC-${Date.now().toString().slice(-6)}`,
        photo: incidentPhoto,
      };
      setIncidentReport(report);
      pushMaintenance(report);
    }, 1800);
  };

  const resetIncident = () => {
    setIncidentReport(null);
    setIncidentType(null);
    setIncidentText("");
    setIncidentPhoto(null);
  };

  const startVoiceInput = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = lang === "ar" ? "ar-TN" : lang === "en" ? "en-US" : "fr-FR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setMicListening(true);
    recognition.onend = () => setMicListening(false);
    recognition.onerror = () => setMicListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) setIncidentText(prev => (prev ? prev + " " : "") + transcript);
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setIncidentPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const SPA_CATEGORY_ORDER = [
    "Spa — Visage Cinq Mondes",
    "Spa — Corps Cinq Mondes",
    "Spa — Massages Cinq Mondes",
    "Spa — Grands Rituels",
    "Spa — Massages Signature",
    "Spa — Soins Humides",
    "Beauté — Mains & Pieds",
    "Beauté — Cheveux",
    "Beauté — Épilation",
    "Spa — Journées Oceana",
    "Spa — Escapades Oceana",
  ];
  const spaItems = (appState.services || SERVICES_CATALOG).filter(s => SPA_CATEGORY_ORDER.includes(s.category) && s.active);

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
            <ProactiveAlerts t={t} lang={lang} />
            <ButlerRecommendation guest={guest} t={t} />
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
          <ConciergeChat t={t} guest={guest} hotel={hotel} lang={lang} memory={memory} onMemoryNote={addMemoryNote} pushTicket={pushTicket} />
        )}

        {/* MENU TAB */}
        {activeTab === "menu" && (
          <>
            <h3 className="text-white font-semibold">{t.menu}</h3>
            {MENU_CATEGORY_ORDER.map(cat => (
              <div key={cat}>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">{cat}</p>
                <div className="space-y-2">
                  {MENU_ITEMS.filter(i => i.cat === cat).map(item => (
                    <GlassCard key={item.id} className="p-3 flex items-center gap-3">
                      <img src={item.image} alt={item.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" referrerPolicy="no-referrer" onError={handleImgError} />
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">{item.name}</p>
                        <p className="text-white/40 text-xs mt-0.5">{item.desc}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold" style={{ color: gold }}>{item.price} {hotel.currencySymbol}</span>
                        <button onClick={() => addToCart(item)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{ background: "rgba(212,175,55,0.2)", color: gold }}>
                          <Plus size={14} />
                        </button>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>
            ))}
            {cart.length > 0 && (
              <div className="fixed bottom-4 left-4 right-4 z-40">
                <GlassCard className="p-4" style={{ borderColor: "rgba(212,175,55,0.4)", background: "rgba(10,10,10,0.95)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">{cart.reduce((s, i) => s + i.qty, 0)} article(s)</p>
                      <p className="text-sm" style={{ color: gold }}>{t.total} : {cartTotal} {hotel.currencySymbol}</p>
                    </div>
                    <GoldButton onClick={startCardPayment} disabled={paymentInitLoading}>
                      <CreditCard size={16} /> {paymentInitLoading ? "..." : t.payQR}
                    </GoldButton>
                  </div>
                  {paymentInitError && (
                    <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                      <AlertTriangle size={12} />{paymentInitError}
                    </p>
                  )}
                </GlassCard>
              </div>
            )}
          </>
        )}

        {/* SPA TAB */}
        {activeTab === "spa" && (
          <>
            <div className="relative h-40 -mx-4 mb-1 overflow-hidden">
              <img src={OCEANA_GALLERY["Spa & Bien-Être"][0]} alt="Spa & Bien-Être Oceana" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" onError={handleImgError} />
              <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(8,8,8,0.15) 0%, rgba(8,8,8,0.55) 60%, #080808 100%)` }} />
              <div className="relative h-full px-4 flex items-end pb-3">
                <h3 className="text-white font-semibold text-lg drop-shadow" style={{ fontFamily: "'Georgia', serif" }}>{t.spa}</h3>
              </div>
            </div>
            {SPA_CATEGORY_ORDER.map((cat, catIdx) => {
              const items = spaItems.filter(i => i.category === cat);
              if (items.length === 0) return null;
              const catImage = OCEANA_GALLERY["Spa & Bien-Être"][catIdx % OCEANA_GALLERY["Spa & Bien-Être"].length];
              return (
                <div key={cat}>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-2">{cat.replace(/^(Spa|Beauté) — /, "")}</p>
                  <div className="space-y-2">
                    {items.map(item => (
                      <GlassCard key={item.id} className="p-3 flex items-center gap-3">
                        <img src={catImage} alt={cat} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" referrerPolicy="no-referrer" onError={handleImgError} />
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">{item.name}</p>
                          {item.duration && <p className="text-white/40 text-xs mt-0.5">{item.duration}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-bold" style={{ color: gold }}>{item.price} {hotel.currencySymbol}</span>
                          <button onClick={() => addToCart(item)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                            style={{ background: "rgba(212,175,55,0.2)", color: gold }}>
                            <Plus size={14} />
                          </button>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                </div>
              );
            })}
            {cart.length > 0 && (
              <div className="fixed bottom-4 left-4 right-4 z-40">
                <GlassCard className="p-4" style={{ borderColor: "rgba(212,175,55,0.4)", background: "rgba(10,10,10,0.95)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">{cart.reduce((s, i) => s + i.qty, 0)} article(s)</p>
                      <p className="text-sm" style={{ color: gold }}>{t.total} : {cartTotal} {hotel.currencySymbol}</p>
                    </div>
                    <GoldButton onClick={startCardPayment} disabled={paymentInitLoading}>
                      <CreditCard size={16} /> {paymentInitLoading ? "..." : t.payQR}
                    </GoldButton>
                  </div>
                  {paymentInitError && (
                    <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                      <AlertTriangle size={12} />{paymentInitError}
                    </p>
                  )}
                </GlassCard>
              </div>
            )}
          </>
        )}

        {/* ROOM SERVICE */}
        {activeTab === "roomservice" && (
          <div className="space-y-3">
            <h3 className="text-white font-semibold">{t.roomService}</h3>
            {ROOM_REQUESTS.map(req => (
              <GlassCard key={req.id} className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={req.image} alt={req.label} className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" onError={handleImgError} />
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(8,8,8,0.4)" }}>
                      <req.icon size={16} style={{ color: gold }} />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm leading-snug">{req.label}</p>
                    <p className="text-xs text-white/40">{req.price > 0 ? `${req.price} ${hotel.currencySymbol}` : "Gratuit"}</p>
                  </div>
                </div>
                <GoldButton variant="ghost" className="flex-shrink-0" onClick={() => { setModal(`requested_${req.id}`); pushTicket(req.label, req.price > 0 ? "MED" : "LOW", req.price); if (req.price > 0) setAppState(prev => ({ ...prev, folios: { ...prev.folios, [guestId]: (prev.folios?.[guestId] || 0) + req.price } })); }}>
                  {t.request}
                </GoldButton>
              </GlassCard>
            ))}
          </div>
        )}

        {/* MAINTENANCE — version accessible, pensée pour une prise en main facile (y compris clients âgés) */}
        {activeTab === "maintenance" && (
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">{t.maintenance}</h3>

            {/* ÉTAT 1 : confirmation après envoi */}
            {incidentReport ? (
              <GlassCard className="p-6 space-y-4 text-center" style={{ borderColor: "rgba(52,211,153,0.4)" }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(52,211,153,0.15)" }}>
                  <Check size={32} style={{ color: "#34d399" }} />
                </div>
                <div>
                  <p className="text-white text-lg font-bold">{t.ticketSent}</p>
                  <p className="text-white/50 text-sm mt-1">{t.ticketSentSub}</p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <GoldBadge>#{incidentReport.ticket}</GoldBadge>
                </div>
                {incidentReport.photo && (
                  <img src={incidentReport.photo} alt="" className="w-24 h-24 object-cover rounded-xl mx-auto" />
                )}
                <p className="text-white/70 text-sm">{incidentReport.equipment}</p>
                <p className="text-emerald-400 text-sm font-medium">{incidentReport.solution}</p>
                <button onClick={resetIncident}
                  className="w-full py-3 rounded-xl text-sm font-semibold border"
                  style={{ borderColor: "rgba(212,175,55,0.3)", color: gold }}>
                  {t.newRequest}
                </button>
              </GlassCard>

            /* ÉTAT 2 : analyse en cours */
            ) : incidentAnalyzing ? (
              <GlassCard className="p-8 text-center space-y-4">
                <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: gold, borderTopColor: "transparent" }} />
                <p className="text-white/60 text-sm">{t.analyzeAI}...</p>
              </GlassCard>

            /* ÉTAT 3 : choix du problème (grille d'icônes larges) ou saisie libre si "Autre" */
            ) : incidentType !== "other" || incidentType === null ? (
              <>
                <p className="text-white/50 text-sm -mt-2">{t.maintenanceIntroSub}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "ac", label: t.issueAC, icon: Snowflake },
                    { key: "wifi", label: t.issueWifi, icon: Wifi },
                    { key: "plumbing", label: t.issuePlumbing, icon: Droplets },
                    { key: "elec", label: t.issueElec, icon: Zap },
                    { key: "cleaning", label: t.issueCleaning, icon: Sparkles },
                  ].map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => analyzeIncident(key)}
                      className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl transition-all active:scale-95"
                      style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)" }}>
                      <Icon size={30} style={{ color: gold }} />
                      <span className="text-white text-sm font-medium text-center px-1">{label}</span>
                    </button>
                  ))}
                  <button onClick={() => setIncidentType("other")}
                    className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl transition-all active:scale-95"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)" }}>
                    <Wrench size={30} className="text-white/70" />
                    <span className="text-white text-sm font-medium text-center px-1">{t.issueOther}</span>
                  </button>
                </div>
              </>

            /* ÉTAT 4 : "Autre" — texte libre + micro + photo */
            ) : (
              <div className="space-y-3">
                <button onClick={() => setIncidentType(null)} className="flex items-center gap-1 text-xs text-white/40">
                  <ChevronLeft size={14} /> {t.back}
                </button>
                <p className="text-white/50 text-sm">{t.otherDescribe}</p>
                <GlassCard className="p-4">
                  <textarea value={incidentText} onChange={e => setIncidentText(e.target.value)}
                    placeholder={t.describeIssue} rows={4}
                    className="w-full bg-transparent text-white text-base placeholder-white/30 focus:outline-none resize-none" />
                </GlassCard>

                <div className="flex gap-3">
                  <button onClick={startVoiceInput}
                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-semibold"
                    style={micListening
                      ? { background: "rgba(212,175,55,0.9)", color: "#000" }
                      : { background: "rgba(255,255,255,0.06)", color: "white", border: "1px solid rgba(255,255,255,0.15)" }}>
                    <Mic size={18} /> {micListening ? t.micListening : t.micStart}
                  </button>
                  <button onClick={() => incidentPhotoRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-semibold"
                    style={{ background: "rgba(255,255,255,0.06)", color: "white", border: "1px solid rgba(255,255,255,0.15)" }}>
                    <Camera size={18} /> {incidentPhoto ? t.photoAdded : t.addPhoto}
                  </button>
                  <input ref={incidentPhotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
                </div>
                {incidentPhoto && <img src={incidentPhoto} alt="" className="w-20 h-20 object-cover rounded-xl" />}

                <GoldButton className="w-full py-4 text-base" onClick={() => analyzeIncident("other")} disabled={!incidentText && !incidentPhoto}>
                  <BrainCircuit size={18} /> {t.sendRequest}
                </GoldButton>
              </div>
            )}

            {/* Filet de sécurité toujours visible : appeler un humain directement */}
            {!incidentReport && (
              <a href="tel:+21672000000"
                className="w-full flex items-center gap-3 p-4 rounded-2xl mt-2"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,175,55,0.15)" }}>
                  <Phone size={20} style={{ color: gold }} />
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-semibold">{t.callReceptionNow}</p>
                  <p className="text-white/40 text-xs">{t.callReceptionSub}</p>
                </div>
              </a>
            )}
          </div>
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

// ─────────────────────────────────────────────────────────────
// HOTEL PMS
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// PMS MODULE — GESTION DES SERVICES (internes / externes, prix)
// ─────────────────────────────────────────────────────────────
function ServicesManager({ t, appState, setAppState, hotel }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // service being edited, or null = new
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [form, setForm] = useState({ name: "", category: "", type: "interne", provider: "", price: "" });
  const services = appState.services || SERVICES_CATALOG;

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", category: "", type: "interne", provider: "", price: "" });
    setModalOpen(true);
  };

  const openEdit = (svc) => {
    setEditing(svc);
    setForm({ name: svc.name, category: svc.category, type: svc.type, provider: svc.provider || "", price: svc.price });
    setModalOpen(true);
  };

  const saveService = () => {
    if (!form.name.trim()) return;
    setAppState(prev => {
      const list = prev.services || SERVICES_CATALOG;
      if (editing) {
        return { ...prev, services: list.map(s => s.id === editing.id ? { ...s, ...form, price: Number(form.price) || 0 } : s) };
      }
      const newSvc = { id: `sv_${Date.now()}`, ...form, price: Number(form.price) || 0, active: true };
      return { ...prev, services: [newSvc, ...list] };
    });
    setModalOpen(false);
  };

  const toggleActive = (id) => {
    setAppState(prev => ({ ...prev, services: (prev.services || SERVICES_CATALOG).map(s => s.id === id ? { ...s, active: !s.active } : s) }));
  };

  const deleteService = (id) => {
    setAppState(prev => ({ ...prev, services: (prev.services || SERVICES_CATALOG).filter(s => s.id !== id) }));
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2"><Package size={16} style={{ color: gold }} />{t.manageServices}</h3>
          <p className="text-white/40 text-xs mt-0.5">{t.manageServicesSub}</p>
        </div>
        <GoldButton onClick={openNew} className="text-xs px-3 py-2 flex-shrink-0"><Plus size={14} />{t.newService}</GoldButton>
      </div>

      {services.length === 0 ? (
        <GlassCard className="p-6 text-center text-white/40 text-sm">{t.noServices}</GlassCard>
      ) : (
        <div className="space-y-2">
          {services.map(svc => (
            <GlassCard key={svc.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-white font-medium text-sm">{svc.name}</p>
                    <GoldBadge className={svc.active ? "" : "opacity-40"}>
                      {svc.type === "interne" ? t.internal : t.external}
                    </GoldBadge>
                  </div>
                  <p className="text-white/40 text-xs">{svc.category}{svc.provider ? ` • ${svc.provider}` : ""}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm" style={{ color: gold }}>{svc.price} {hotel.currencySymbol}</p>
                  {svc.duration && <p className="text-white/30 text-[10px]">{svc.duration}</p>}
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                <button onClick={() => toggleActive(svc.id)} className="flex items-center gap-1.5 text-xs" style={{ color: svc.active ? "#34d399" : "rgba(255,255,255,0.3)" }}>
                  {svc.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  {svc.active ? t.active : t.inactive}
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(svc)} className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1" style={{ background: "rgba(212,175,55,0.1)", color: gold }}>
                    <Settings size={11} />{t.edit}
                  </button>
                  {confirmDeleteId === svc.id ? (
                    <button onClick={() => deleteService(svc.id)} className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 bg-red-500/20 text-red-400">
                      <Check size={11} />{t.confirmDelete}
                    </button>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(svc.id)} className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 bg-red-500/10 text-red-400">
                      <Trash2 size={11} />{t.delete}
                    </button>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t.editService : t.newService}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">{t.serviceName}</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
              style={{ borderColor: "rgba(212,175,55,0.2)" }} />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">{t.serviceCategory}</label>
            <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
              style={{ borderColor: "rgba(212,175,55,0.2)" }} />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">{t.serviceType}</label>
            <div className="flex gap-2">
              {["interne", "externe"].map(ty => (
                <button key={ty} onClick={() => setForm({ ...form, type: ty })}
                  className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                  style={form.type === ty ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
                  {ty === "interne" ? t.internal : t.external}
                </button>
              ))}
            </div>
          </div>
          {form.type === "externe" && (
            <div>
              <label className="text-xs text-white/40 mb-1 block">{t.provider}</label>
              <input value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })}
                className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
                style={{ borderColor: "rgba(212,175,55,0.2)" }} />
            </div>
          )}
          <div>
            <label className="text-xs text-white/40 mb-1 block">{t.price} ({hotel.currencySymbol})</label>
            <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
              className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
              style={{ borderColor: "rgba(212,175,55,0.2)" }} />
          </div>
          <GoldButton onClick={saveService} className="w-full mt-2"><Check size={14} />{t.save}</GoldButton>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PMS MODULE — FICHES POLICE (regroupées depuis le check-in client)
// ─────────────────────────────────────────────────────────────
function PoliceRecords({ t, appState }) {
  const [selected, setSelected] = useState(null);
  const records = appState.policeForms || [];

  const formatDate = (iso) => {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-white font-semibold flex items-center gap-2"><ShieldCheck size={16} style={{ color: gold }} />{t.policeRecords}</h3>
        <p className="text-white/40 text-xs mt-0.5">{t.policeRecordsSub}</p>
      </div>

      {records.length === 0 ? (
        <GlassCard className="p-6 text-center text-white/40 text-sm">{t.noRecords}</GlassCard>
      ) : (
        <div className="space-y-2">
          {records.map(r => (
            <GlassCard key={r.id} onClick={() => setSelected(r)} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium text-sm">{r.firstName} {r.lastName}</p>
                  <p className="text-white/40 text-xs">{t.room} {r.room} • {r.idNumber}</p>
                </div>
                <div className="flex items-center gap-2">
                  {r.hasSignature && <GoldBadge><Check size={10} />{t.signatureCaptured}</GoldBadge>}
                  <ChevronRight size={14} className="text-white/30" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.firstName} ${selected.lastName}` : ""}>
        {selected && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-white/40">{t.idNumber}</p><p className="text-white text-sm">{selected.idNumber}</p></div>
              <div><p className="text-xs text-white/40">{t.age}</p><p className="text-white text-sm">{selected.age}</p></div>
              <div><p className="text-xs text-white/40">{t.gender}</p><p className="text-white text-sm">{selected.gender}</p></div>
              <div><p className="text-xs text-white/40">{t.profession}</p><p className="text-white text-sm">{selected.profession}</p></div>
              <div><p className="text-xs text-white/40">{t.from}</p><p className="text-white text-sm">{selected.from}</p></div>
              <div><p className="text-xs text-white/40">{t.destination}</p><p className="text-white text-sm">{selected.destination}</p></div>
              <div><p className="text-xs text-white/40">{t.arrival}</p><p className="text-white text-sm">{selected.arrival}</p></div>
              <div><p className="text-xs text-white/40">{t.departure}</p><p className="text-white text-sm">{selected.departure}</p></div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <GoldBadge><Upload size={10} />{t.idDocument} ✓</GoldBadge>
              {selected.hasSignature && <GoldBadge><Check size={10} />{t.signatureCaptured}</GoldBadge>}
            </div>
            <p className="text-xs text-white/30">{t.submittedOn}: {formatDate(selected.submittedAt)}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PMS MODULE — CHECK-IN / CHECK-OUT MANUEL (réceptionniste)
// ─────────────────────────────────────────────────────────────
// Vérification d'un pass QR par la réception : lecteur USB (saisie
// clavier + Entrée), collage du contenu, ou caméra (BarcodeDetector,
// Chrome/Android ; getUserMedia exige HTTPS ou localhost).
function QrVerifyPanel() {
  const [input, setInput] = useState("");
  const [state, setState] = useState({ kind: "idle" });
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const canScan = typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;

  const verify = async (raw) => {
    const parsed = decodeQrPayload(raw);
    if (!parsed) { setState({ kind: "bad_format" }); return; }
    if (!parsed.qrToken) { setState({ kind: "no_token" }); return; }
    setState({ kind: "loading" });
    try {
      // GET /stays/:stayId/qr-verify?token=… → { valid, guestName?, room? }
      const res = await checkinApi.verifyStayQr(parsed.stayId, parsed.qrToken);
      setState(res?.valid ? { kind: "valid", guestName: res.guestName, room: res.room } : { kind: "invalid" });
    } catch (err) {
      setState({ kind: "error", message: err instanceof ApiError ? err.message : "Vérification impossible" });
    }
  };

  useEffect(() => {
    if (!scanning) return;
    let stream = null;
    let raf = 0;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped) { stream.getTracks().forEach(tr => tr.stop()); return; }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const tick = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(video);
            if (codes.length > 0) {
              setScanning(false);
              setInput(codes[0].rawValue);
              verify(codes[0].rawValue);
              return;
            }
          } catch { /* image pas encore prête : on réessaie */ }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setScanning(false);
        setState({ kind: "error", message: "Caméra indisponible (autorisation refusée ou page non sécurisée)." });
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach(tr => tr.stop());
    };
  }, [scanning]);

  return (
    <GlassCard className="p-4 space-y-3">
      <div>
        <h3 className="text-white font-semibold flex items-center gap-2"><QrCode size={16} style={{ color: gold }} />Vérifier un pass QR</h3>
        <p className="text-white/40 text-xs mt-1">Scannez le QR du client (lecteur ou caméra) ou collez son contenu.</p>
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && input.trim()) verify(input); }}
          placeholder="Contenu du QR…"
          className="flex-1 min-w-0 bg-white/5 border rounded-xl px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none"
          style={{ borderColor: "rgba(212,175,55,0.2)" }} />
        <GoldButton className="text-xs px-3" disabled={!input.trim() || state.kind === "loading"} onClick={() => verify(input)}>
          {state.kind === "loading" ? "…" : "Vérifier"}
        </GoldButton>
        {canScan && (
          <GoldButton variant="ghost" className="px-3" onClick={() => setScanning(v => !v)}>
            <Camera size={14} />
          </GoldButton>
        )}
      </div>
      {scanning && (
        <video ref={videoRef} playsInline muted className="w-full rounded-xl bg-black" style={{ maxHeight: 260 }} />
      )}
      {state.kind === "valid" && (
        <p className="text-sm flex items-center gap-2" style={{ color: "#4ade80" }}>
          <Check size={16} />Pass valide{state.guestName ? ` — ${state.guestName}` : ""}{state.room ? ` · Chambre ${state.room}` : ""}
        </p>
      )}
      {state.kind === "invalid" && (
        <p className="text-sm text-red-400 flex items-center gap-2"><X size={16} />Pass invalide ou falsifié.</p>
      )}
      {state.kind === "bad_format" && (
        <p className="text-sm text-red-400 flex items-center gap-2"><AlertTriangle size={16} />Ce contenu n'est pas un QR LuxePass.</p>
      )}
      {state.kind === "no_token" && (
        <p className="text-sm text-red-400 flex items-center gap-2"><AlertTriangle size={16} />QR sans jeton de sécurité : impossible à vérifier.</p>
      )}
      {state.kind === "error" && (
        <p className="text-sm text-red-400 flex items-center gap-2"><AlertTriangle size={16} />{state.message}</p>
      )}
    </GlassCard>
  );
}

function ManualCheckInOut({ t, appState, setAppState, hotel, digitalPendingStays = [], digitalActiveStays = [], onMarkPmsSynced, onDigitalCheckout }) {
  const [roomAssign, setRoomAssign] = useState({});
  const [toast, setToast] = useState(null);
  const guests = appState.pmsGuests || PMS_GUESTS;
  const digitalInHouse = digitalActiveStays.filter(s => s.stage === "completed");
  const rooms = appState.rooms || ROOMS_STATUS;
  const pending = guests.filter(g => !g.checkedIn);
  const inHouse = guests.filter(g => g.checkedIn);

  const flashToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const confirmCheckin = (guestId) => {
    const room = roomAssign[guestId];
    const guestName = guests.find(g => g.id === guestId)?.name || guestId;
    setAppState(prev => ({
      ...prev,
      pmsGuests: (prev.pmsGuests || PMS_GUESTS).map(g => g.id === guestId
        ? { ...g, checkedIn: true, room: room || g.room, arrival: "Présent", status: "AI Validé" }
        : g),
      rooms: room ? (prev.rooms || ROOMS_STATUS).map(r => r.id === room ? { ...r, status: "occupied" } : r) : prev.rooms,
      auditLog: [{ id: `al_${Date.now()}`, action: `Check-in manuel confirmé — ${guestName} (chambre ${room || "—"})`, time: "à l'instant" }, ...(prev.auditLog || [])],
    }));
    flashToast(t.checkinSuccess);
  };

  const confirmCheckout = (guestId, room) => {
    const guestName = guests.find(g => g.id === guestId)?.name || guestId;
    setAppState(prev => ({
      ...prev,
      pmsGuests: (prev.pmsGuests || PMS_GUESTS).filter(g => g.id !== guestId),
      rooms: (prev.rooms || ROOMS_STATUS).map(r => r.id === room ? { ...r, status: "cleaning" } : r),
      auditLog: [{ id: `al_${Date.now()}`, action: `Check-out manuel confirmé — ${guestName} (chambre ${room})`, time: "à l'instant" }, ...(prev.auditLog || [])],
    }));
    flashToast(t.checkoutSuccess);
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: gold, color: "#000" }}>
          {toast}
        </div>
      )}

      <QrVerifyPanel />

      {/* Check-ins digitaux réels — parcours self-service complété par le client */}
      <div>
        <h3 className="text-white font-semibold flex items-center gap-2 mb-1"><ScanFace size={16} style={{ color: gold }} />Check-ins digitaux à reprendre en PMS</h3>
        <p className="text-white/40 text-xs mb-3">Complétés via l'app client, pas encore rapprochés (ancien PMS)</p>
        {digitalPendingStays.length === 0 ? (
          <GlassCard className="p-5 text-center text-white/40 text-sm">Aucun check-in digital en attente</GlassCard>
        ) : (
          <div className="space-y-2">
            {digitalPendingStays.map(s => (
              <GlassCard key={s.stayId} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-white text-sm font-medium">{s.guestData?.firstName} {s.guestData?.lastName}</p>
                  <p className="text-white/40 text-xs">{t.room} {s.room || "—"} • Arrivée {s.guestData?.arrival}</p>
                </div>
                <GoldButton onClick={() => onMarkPmsSynced?.(s.stayId)} className="text-xs px-3 py-1.5 flex-shrink-0">
                  <Check size={13} /> Marquer synchronisé
                </GoldButton>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Séjours digitaux en cours — check-out réel via le backend */}
      <div>
        <h3 className="text-white font-semibold flex items-center gap-2 mb-1"><LogOut size={16} style={{ color: gold }} />Séjours digitaux en cours</h3>
        <p className="text-white/40 text-xs mb-3">Check-out réel (facture le folio, ferme la session)</p>
        {digitalInHouse.length === 0 ? (
          <GlassCard className="p-5 text-center text-white/40 text-sm">Aucun séjour digital actif</GlassCard>
        ) : (
          <div className="space-y-2">
            {digitalInHouse.map(s => (
              <GlassCard key={s.stayId} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-white text-sm font-medium">{s.guestData?.firstName} {s.guestData?.lastName}</p>
                  <p className="text-white/40 text-xs">{t.room} {s.room || "—"}</p>
                </div>
                <GoldButton variant="ghost" onClick={() => onDigitalCheckout?.(s.stayId)} className="text-xs px-3 py-1.5 flex-shrink-0">
                  <LogOut size={13} /> {t.confirmCheckout}
                </GoldButton>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <div className="pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <h3 className="text-white font-semibold flex items-center gap-2 mb-1"><Users size={16} style={{ color: gold }} />{t.manualCheckin}</h3>
        <p className="text-white/40 text-xs mb-3">{t.pendingCheckin}</p>
        {pending.length === 0 ? (
          <GlassCard className="p-5 text-center text-white/40 text-sm">{t.noPendingCheckin}</GlassCard>
        ) : (
          <div className="space-y-2">
            {pending.map(g => (
              <GlassCard key={g.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{g.nationality}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{g.name}</p>
                      <p className="text-white/40 text-xs">{g.arrival}</p>
                    </div>
                  </div>
                  <GoldBadge>{t.room} {g.room}</GoldBadge>
                </div>
                <div className="flex items-center gap-2">
                  <select value={roomAssign[g.id] || g.room} onChange={e => setRoomAssign({ ...roomAssign, [g.id]: e.target.value })}
                    className="flex-1 bg-white/5 border rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                    style={{ borderColor: "rgba(212,175,55,0.2)" }}>
                    {rooms.filter(r => r.status === "ready" || r.id === g.room).map(r => (
                      <option key={r.id} value={r.id} className="bg-black">{r.id}</option>
                    ))}
                  </select>
                  <GoldButton onClick={() => confirmCheckin(g.id)} className="text-xs px-3 py-2 flex-shrink-0">
                    <Check size={13} />{t.confirmCheckin}
                  </GoldButton>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-white font-semibold flex items-center gap-2 mb-1"><LogOut size={16} style={{ color: gold }} />{t.manualCheckout}</h3>
        <p className="text-white/40 text-xs mb-3">{t.checkedInGuests}</p>
        {inHouse.length === 0 ? (
          <GlassCard className="p-5 text-center text-white/40 text-sm">{t.noCheckedInGuests}</GlassCard>
        ) : (
          <div className="space-y-2">
            {inHouse.map(g => (
              <GlassCard key={g.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{g.nationality}</span>
                  <div>
                    <p className="text-white text-sm font-medium">{g.name}</p>
                    <p className="text-white/40 text-xs">{t.room} {g.room}</p>
                  </div>
                </div>
                <GoldButton variant="ghost" onClick={() => confirmCheckout(g.id, g.room)} className="text-xs px-3 py-1.5 flex-shrink-0">
                  <LogOut size={13} />{t.confirmCheckout}
                </GoldButton>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODULE 1+2 — RÉSERVATIONS MULTI-CANAL & YIELD/REVENUE MANAGEMENT
// ─────────────────────────────────────────────────────────────
function ReservationsYield({ t, appState, setAppState, hotel }) {
  const [subTab, setSubTab] = useState("reservations");
  const [autoPilot, setAutoPilot] = useState(true);
  const reservations = appState.reservations || RESERVATIONS;

  const channelInfo = (key) => CHANNELS.find(c => c.key === key) || CHANNELS[0];
  const statusColor = (s) => s === "confirmed" ? "#34d399" : s === "waitlist" ? "#fbbf24" : s === "pending" ? "#60a5fa" : "#f87171";
  const statusLabel = (s) => ({ confirmed: "Confirmée", waitlist: "Liste d'attente", pending: "En attente", cancelled: "Annulée" }[s] || s);

  const bookedByType = (typeId) => reservations.filter(r => r.roomType === typeId && r.status !== "cancelled").reduce((sum, r) => sum + (r.pax > 1 && r.groupName ? 1 : 1), 0);

  const totalImpact = YIELD_FACTORS.reduce((s, f) => s + f.impact, 0);

  const cancelReservation = (id) => setAppState(prev => ({ ...prev, reservations: (prev.reservations || RESERVATIONS).map(r => r.id === id ? { ...r, status: "cancelled" } : r) }));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setSubTab("reservations")} className="flex-1 py-2 rounded-xl text-xs font-medium" style={subTab === "reservations" ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>Réservations</button>
        <button onClick={() => setSubTab("yield")} className="flex-1 py-2 rounded-xl text-xs font-medium" style={subTab === "yield" ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>Yield & Tarifs</button>
      </div>

      {subTab === "reservations" && (
        <div className="space-y-4">
          {/* Allotement par type de chambre */}
          <div>
            <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2">Allotement par catégorie</h4>
            <div className="grid grid-cols-2 gap-2">
              {ROOM_TYPES.map(rt => {
                const booked = bookedByType(rt.id);
                const over = booked > rt.total;
                return (
                  <GlassCard key={rt.id} className="p-3">
                    <p className="text-white text-xs font-medium truncate">{rt.name}</p>
                    <p className={`text-lg font-bold mt-1 ${over ? "text-red-400" : ""}`} style={!over ? { color: gold } : {}}>{booked}/{rt.total}</p>
                    {over && <p className="text-red-400 text-[10px] flex items-center gap-1 mt-0.5"><AlertTriangle size={10} />Overbooking</p>}
                  </GlassCard>
                );
              })}
            </div>
          </div>

          {/* Liste des réservations multi-canal */}
          <div>
            <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2">Réservations — tous canaux</h4>
            <div className="space-y-2">
              {reservations.map(r => {
                const ch = channelInfo(r.channel);
                return (
                  <GlassCard key={r.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{r.guestName}</p>
                        <p className="text-white/40 text-xs">{ROOM_TYPES.find(t2 => t2.id === r.roomType)?.name} • {r.checkIn} → {r.checkOut}</p>
                      </div>
                      <span className="text-xs font-bold flex-shrink-0" style={{ color: gold }}>{r.rate} {hotel.currencySymbol}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${ch.color}25`, color: ch.color }}>{ch.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium" style={{ color: statusColor(r.status) }}>{statusLabel(r.status)}</span>
                        {r.status !== "cancelled" && (
                          <button onClick={() => cancelReservation(r.id)} className="text-red-400 text-xs"><X size={12} /></button>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {subTab === "yield" && (
        <div className="space-y-4">
          <GlassCard className="p-4" style={{ borderColor: "rgba(212,175,55,0.3)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-semibold text-sm flex items-center gap-2"><TrendingUp size={15} style={{ color: gold }} />Pilotage tarifaire IA</p>
              <button onClick={() => setAutoPilot(!autoPilot)} style={{ color: autoPilot ? "#34d399" : "rgba(255,255,255,0.3)" }}>
                {autoPilot ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
              </button>
            </div>
            <p className="text-white/50 text-xs mb-3">{autoPilot ? "Ajustement automatique activé — les tarifs se mettent à jour selon la demande en temps réel." : "Mode manuel — les tarifs restent figés jusqu'à validation."}</p>
            <div className="text-center py-3 rounded-xl" style={{ background: "rgba(212,175,55,0.08)" }}>
              <p className="text-white/40 text-xs">Ajustement net suggéré</p>
              <p className="text-2xl font-bold" style={{ color: totalImpact >= 0 ? "#34d399" : "#f87171" }}>{totalImpact >= 0 ? "+" : ""}{totalImpact}%</p>
            </div>
          </GlassCard>

          <div>
            <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2">Facteurs de demande</h4>
            <div className="space-y-2">
              {YIELD_FACTORS.map(f => (
                <div key={f.key} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                  <p className="text-white text-xs">{f.label}</p>
                  <span className="text-xs font-bold" style={{ color: f.impact >= 0 ? "#34d399" : "#f87171" }}>{f.impact >= 0 ? "+" : ""}{f.impact}%</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2">Tarifs recommandés par catégorie</h4>
            <div className="grid grid-cols-2 gap-2">
              {ROOM_TYPES.map(rt => {
                const adjusted = Math.round(rt.baseRate * (1 + totalImpact / 100));
                return (
                  <GlassCard key={rt.id} className="p-3">
                    <p className="text-white/50 text-[10px] truncate">{rt.name}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-white/30 text-xs line-through">{rt.baseRate}</span>
                      <span className="text-base font-bold" style={{ color: gold }}>{adjusted} {hotel.currencySymbol}</span>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODULE 3+8 — FACTURATION COMPLÈTE (folio, split billing, taxes, PCI-DSS)
// ─────────────────────────────────────────────────────────────
function BillingCenter({ t, appState, setAppState, hotel, digitalFolios = { folios: [], grandTotal: 0 } }) {
  const [invoiceType, setInvoiceType] = useState("individual");
  const [splitCount, setSplitCount] = useState(1);
  const guests = appState.pmsGuests || PMS_GUESTS;
  const tokens = PAYMENT_TOKENS;

  const taxeSejour = 3; // par pers/nuit en DT — simplifié
  const tvaRate = 0.13;

  return (
    <div className="space-y-5">
      {/* Folios réels — commandes + services facturés sur les séjours digitaux */}
      <div>
        <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
          Folios réels (séjours digitaux) <GoldBadge>{digitalFolios.grandTotal?.toFixed(1) || "0.0"} {hotel.currencySymbol} au total</GoldBadge>
        </h4>
        {(!digitalFolios.folios || digitalFolios.folios.length === 0) ? (
          <GlassCard className="p-4 text-center text-white/40 text-xs mb-2">Aucune commande facturée sur un séjour digital pour l'instant</GlassCard>
        ) : (
          <div className="space-y-2 mb-2">
            {digitalFolios.folios.map(f => (
              <GlassCard key={f.stayId} className="p-3">
                <div className="flex items-center justify-between">
                  <p className="text-white text-sm font-medium">{f.guestName || "Client"} — {t.room} {f.room || "—"}</p>
                  <p className="font-bold text-sm" style={{ color: gold }}>{f.total.toFixed(1)} {hotel.currencySymbol}</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-white/40 mt-1">
                  <span>Commandes : {f.ordersTotal.toFixed(1)} {hotel.currencySymbol}</span>
                  <span>Services facturés : {f.servicesTotal.toFixed(1)} {hotel.currencySymbol}</span>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Folios (registre manuel, démo) */}
      <div>
        <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2">Folios en cours (registre manuel)</h4>
        <div className="space-y-2">
          {guests.map(g => {
            const folio = appState.folios?.[g.id] || 0;
            const tva = folio * tvaRate;
            return (
              <GlassCard key={g.id} className="p-3">
                <div className="flex items-center justify-between">
                  <p className="text-white text-sm font-medium">{g.name} — {t.room} {g.room}</p>
                  <p className="font-bold text-sm" style={{ color: gold }}>{folio.toFixed(1)} {hotel.currencySymbol}</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-white/40 mt-1">
                  <span>Dont TVA 13% : {tva.toFixed(1)} {hotel.currencySymbol}</span>
                  <span>Taxe séjour : {taxeSejour} {hotel.currencySymbol}/nuit</span>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* Facturation société vs individuelle + split billing */}
      <GlassCard className="p-4">
        <p className="text-white font-semibold text-sm mb-3 flex items-center gap-2"><FileText size={15} style={{ color: gold }} />Génération de facture</p>
        <div className="flex gap-2 mb-3">
          {["individual", "company"].map(ty => (
            <button key={ty} onClick={() => setInvoiceType(ty)} className="flex-1 py-2 rounded-xl text-xs font-medium" style={invoiceType === ty ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
              {ty === "individual" ? "Client individuel" : "Facture société"}
            </button>
          ))}
        </div>
        {invoiceType === "company" && (
          <div className="space-y-2 mb-3">
            <input placeholder="Raison sociale" className="w-full bg-white/5 border rounded-xl px-3 py-2 text-white text-xs focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
            <input placeholder="Matricule fiscal" className="w-full bg-white/5 border rounded-xl px-3 py-2 text-white text-xs focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
          </div>
        )}
        <div className="flex items-center gap-2 mb-3">
          <Split size={14} className="text-white/40" />
          <p className="text-xs text-white/50">Répartir sur</p>
          <input type="number" min="1" value={splitCount} onChange={e => setSplitCount(Math.max(1, Number(e.target.value)))} className="w-14 bg-white/5 border rounded-lg px-2 py-1 text-white text-xs text-center focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
          <p className="text-xs text-white/50">payeur(s)</p>
        </div>
        <div className="space-y-1 mb-3">
          {INVOICE_ENTRIES_SAMPLE.map((e, i) => (
            <div key={i} className="flex items-center justify-between text-xs text-white/60">
              <span>{e.label}</span><span>{(e.amount / splitCount).toFixed(1)} {hotel.currencySymbol}</span>
            </div>
          ))}
        </div>
        <GoldButton className="w-full text-xs py-2"><FileText size={13} />Générer la facture</GoldButton>
      </GlassCard>

      {/* PCI-DSS — tokenisation des cartes */}
      <div>
        <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2 flex items-center gap-1"><Lock size={12} />Paiement sécurisé — conformité PCI-DSS</h4>
        <div className="space-y-2">
          {tokens.map(tk => (
            <GlassCard key={tk.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="text-white text-xs font-medium">{tk.brand} •••• {tk.last4}</p>
                <p className="text-white/30 text-[10px] font-mono">{tk.token}</p>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: gold }}>Pré-autorisation {tk.preAuth} {hotel.currencySymbol}</p>
                <GoldBadge>Tokenisé ✓</GoldBadge>
              </div>
            </GlassCard>
          ))}
        </div>
        <p className="text-white/30 text-[10px] mt-2">Aucune donnée carte brute n'est stockée — seules des références tokenisées transitent dans le PMS, conformément aux exigences PCI-DSS.</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODULE 4 — NIGHT AUDIT (clôture de nuit)
// ─────────────────────────────────────────────────────────────
function NightAuditModule({ t, appState, setAppState, hotel }) {
  const [running, setRunning] = useState(false);
  const log = appState.nightAuditLog || [];
  const guests = appState.pmsGuests || PMS_GUESTS;

  const runAudit = () => {
    setRunning(true);
    setTimeout(() => {
      const totalRevenue = guests.reduce((s, g) => s + (appState.folios?.[g.id] || 0), 0) + Math.round(Math.random() * 800);
      const occ = Math.round(70 + Math.random() * 25);
      const adr = Math.round(280 + Math.random() * 100);
      const entry = {
        id: `na_${Date.now()}`,
        date: new Date().toLocaleDateString(),
        totalRevenue: totalRevenue.toFixed(0),
        occupancy: occ,
        adr,
        revpar: Math.round(adr * occ / 100),
        guestsCharged: guests.length,
      };
      setAppState(prev => ({
        ...prev,
        nightAuditLog: [entry, ...(prev.nightAuditLog || [])],
        auditLog: [{ id: `al_${Date.now()}`, action: `Night audit clôturé — ${entry.date}`, time: "à l'instant" }, ...(prev.auditLog || [])],
      }));
      setRunning(false);
    }, 2200);
  };

  return (
    <div className="space-y-4">
      <GlassCard className="p-5 text-center" style={{ borderColor: "rgba(212,175,55,0.3)" }}>
        <CalendarClock size={28} style={{ color: gold }} className="mx-auto mb-2" />
        <p className="text-white font-semibold text-sm mb-1">Clôture de nuit</p>
        <p className="text-white/40 text-xs mb-4">Recalcule les charges, applique la taxe de séjour à tous les clients présents, et verrouille la journée comptable.</p>
        <GoldButton onClick={runAudit} disabled={running} className="w-full">
          {running ? <><RefreshCw size={14} className="animate-spin" />Traitement en cours...</> : <><CalendarClock size={14} />Lancer la clôture de nuit</>}
        </GoldButton>
      </GlassCard>

      {log.length > 0 && (
        <div>
          <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2">Historique des clôtures</h4>
          <div className="space-y-2">
            {log.map(entry => (
              <GlassCard key={entry.id} className="p-4">
                <p className="text-white text-sm font-medium mb-2">{entry.date}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-white/40 text-[10px]">Revenu</p><p className="text-white font-bold text-sm">{entry.totalRevenue} {hotel.currencySymbol}</p></div>
                  <div><p className="text-white/40 text-[10px]">Occupation</p><p className="text-white font-bold text-sm">{entry.occupancy}%</p></div>
                  <div><p className="text-white/40 text-[10px]">RevPAR</p><p className="font-bold text-sm" style={{ color: gold }}>{entry.revpar} {hotel.currencySymbol}</p></div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODULE 5 — HOUSEKEEPING AVANCÉ
// ─────────────────────────────────────────────────────────────
function HousekeepingAdvanced({ t, appState, setAppState }) {
  const detail = appState.roomDetailStatus || ROOM_DETAIL_STATUS;
  const rooms = appState.rooms || ROOMS_STATUS;

  const statusCfg = {
    ready: { label: "Propre", color: "#34d399" },
    dirty: { label: "Sale", color: "#f87171" },
    cleaning: { label: "En nettoyage", color: "#fbbf24" },
    inspected: { label: "Inspectée", color: gold },
    out_of_order: { label: "Hors service", color: "#94a3b8" },
  };

  const assign = (roomId, staff) => setAppState(prev => ({
    ...prev,
    roomDetailStatus: { ...(prev.roomDetailStatus || ROOM_DETAIL_STATUS), [roomId]: { ...(prev.roomDetailStatus?.[roomId] || {}), assignedTo: staff } },
  }));

  const markInspected = (roomId) => setAppState(prev => ({
    ...prev,
    roomDetailStatus: { ...(prev.roomDetailStatus || ROOM_DETAIL_STATUS), [roomId]: { ...(prev.roomDetailStatus?.[roomId] || {}), status: "inspected", inspected: true } },
  }));

  const avgAll = Object.values(detail).filter(d => d.avgMinutes).reduce((s, d, _, arr) => s + d.avgMinutes / arr.length, 0);

  return (
    <div className="space-y-4">
      <GlassCard className="p-4 flex items-center justify-between">
        <div>
          <p className="text-white/40 text-xs">Temps moyen de nettoyage</p>
          <p className="text-white font-bold text-lg">{avgAll ? avgAll.toFixed(0) : "—"} min</p>
        </div>
        <ClipboardCheck size={24} style={{ color: gold }} />
      </GlassCard>

      <div className="space-y-2">
        {rooms.map(r => {
          const d = detail[r.id] || { status: r.status, assignedTo: null, avgMinutes: null, inspected: false };
          const cfg = statusCfg[d.status] || statusCfg.ready;
          return (
            <GlassCard key={r.id} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-semibold text-sm">Chambre {r.id}</p>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: `${cfg.color}25`, color: cfg.color }}>{cfg.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <select value={d.assignedTo || ""} onChange={e => assign(r.id, e.target.value)}
                  className="flex-1 bg-white/5 border rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }}>
                  <option value="" className="bg-black">Non assignée</option>
                  {HOUSEKEEPING_STAFF.map(s => <option key={s} value={s} className="bg-black">{s}</option>)}
                </select>
                {d.status !== "inspected" && d.status !== "out_of_order" && (
                  <button onClick={() => markInspected(r.id)} className="text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0" style={{ background: "rgba(212,175,55,0.15)", color: gold }}>
                    <ClipboardCheck size={11} />Inspecter
                  </button>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODULE 6 — CRM UNIFIÉ MULTI-SÉJOURS
// ─────────────────────────────────────────────────────────────
function CRMHub({ t, appState, setAppState, hotel }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const blacklist = appState.crmBlacklist || {};

  const tierColor = (tier) => ({ Silver: "#94a3b8", Gold: "#fbbf24", Platinum: "#e5e7eb", Black: "#111" }[tier] || gold);

  const filtered = CRM_PROFILES.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const toggleBlacklist = (id) => setAppState(prev => ({ ...prev, crmBlacklist: { ...(prev.crmBlacklist || {}), [id]: !prev.crmBlacklist?.[id] } }));

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un client..."
          className="w-full bg-white/5 border rounded-xl pl-9 pr-3 py-2.5 text-white text-sm focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
      </div>
      <div className="space-y-2">
        {filtered.map(p => (
          <GlassCard key={p.id} onClick={() => setSelected(p)} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{p.name}</p>
                <p className="text-white/40 text-xs">{p.totalStays} séjours • {p.hotelsVisited.length} établissements</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${tierColor(p.tier)}25`, color: tierColor(p.tier) }}>{p.tier}</span>
                {blacklist[p.id] && <p className="text-red-400 text-[10px] mt-1">⚠ Liste noire</p>}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-white/40">Séjours totaux</p><p className="text-white text-sm font-bold">{selected.totalStays}</p></div>
              <div><p className="text-xs text-white/40">Valeur client (LTV)</p><p className="text-sm font-bold" style={{ color: gold }}>{selected.lifetimeValue} {hotel.currencySymbol}</p></div>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-1">Établissements visités</p>
              <div className="flex flex-wrap gap-1">{selected.hotelsVisited.map(h => <GoldBadge key={h}>{h}</GoldBadge>)}</div>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-1">Préférences consolidées (tous séjours)</p>
              {selected.prefs.length === 0 ? <p className="text-white/30 text-xs">Aucune préférence enregistrée.</p> : (
                <div className="space-y-1">{selected.prefs.map((pr, i) => <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg p-2 text-xs text-white/70"><Eye size={11} style={{ color: gold }} />{pr}</div>)}</div>
              )}
            </div>
            <button onClick={() => toggleBlacklist(selected.id)} className="w-full text-xs py-2 rounded-xl flex items-center justify-center gap-2" style={blacklist[selected.id] ? { background: "rgba(16,185,129,0.15)", color: "#34d399" } : { background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
              {blacklist[selected.id] ? <><Check size={12} />Retirer de la liste noire</> : <><AlertTriangle size={12} />Ajouter à la liste noire</>}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODULE 7 — CONFORMITÉ RÉGLEMENTAIRE (télédéclaration police/immigration)
// ─────────────────────────────────────────────────────────────
function ComplianceCenter({ t, appState, setAppState }) {
  const [sending, setSending] = useState(null);
  const records = appState.policeForms || [];
  const teleStatus = appState.teleDeclarationStatus || {};

  const declare = (id) => {
    setSending(id);
    setTimeout(() => {
      setAppState(prev => ({
        ...prev,
        teleDeclarationStatus: { ...(prev.teleDeclarationStatus || {}), [id]: "accepted" },
        auditLog: [{ id: `al_${Date.now()}`, action: `Télédéclaration police envoyée — fiche ${id}`, time: "à l'instant" }, ...(prev.auditLog || [])],
      }));
      setSending(null);
    }, 1600);
  };

  const statusLabel = (s) => s === "accepted" ? "Acceptée par les autorités" : s === "pending" ? "En cours d'envoi" : "Non télédéclarée";
  const statusColor = (s) => s === "accepted" ? "#34d399" : s === "pending" ? "#fbbf24" : "rgba(255,255,255,0.3)";

  return (
    <div className="space-y-4">
      <GlassCard className="p-4" style={{ borderColor: "rgba(212,175,55,0.3)" }}>
        <p className="text-white font-semibold text-sm flex items-center gap-2 mb-1"><FileText size={15} style={{ color: gold }} />Télédéclaration Police & Immigration</p>
        <p className="text-white/40 text-xs">Transmission automatique des fiches clients au portail officiel de la Direction Générale de la Sûreté Nationale, conformément à la réglementation en vigueur.</p>
      </GlassCard>

      {records.length === 0 ? (
        <GlassCard className="p-6 text-center text-white/40 text-sm">Aucune fiche à télédéclarer.</GlassCard>
      ) : (
        <div className="space-y-2">
          {records.map(r => {
            const status = teleStatus[r.id] || "none";
            return (
              <GlassCard key={r.id} className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{r.firstName} {r.lastName}</p>
                  <p className="text-xs" style={{ color: statusColor(status) }}>{statusLabel(status)}</p>
                </div>
                {status !== "accepted" && (
                  <button onClick={() => declare(r.id)} disabled={sending === r.id}
                    className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0" style={{ background: "rgba(212,175,55,0.15)", color: gold }}>
                    {sending === r.id ? <><RefreshCw size={11} className="animate-spin" />Envoi...</> : <><Send size={11} />Télédéclarer</>}
                  </button>
                )}
                {status === "accepted" && <BadgeCheck size={18} className="text-emerald-400 flex-shrink-0" />}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODULE 9 — REPORTING (ADR, RevPAR, forecast, STR comp set)
// ─────────────────────────────────────────────────────────────
function ReportingDashboard({ t, appState, hotel, digitalActiveStays = [], digitalFolios = { folios: [], grandTotal: 0 } }) {
  const maxOcc = Math.max(...FORECAST_7D.map(d => d.occ));
  const maxComp = Math.max(...COMP_SET.map(c => c.adr));
  const inHouseCount = digitalActiveStays.filter(s => s.stage === "completed").length;

  return (
    <div className="space-y-5">
      {/* KPIs réels (séjours digitaux) */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard icon={Users} label="Séjours digitaux actifs" value={inHouseCount} />
        <KpiCard icon={DollarSign} label="CA digital cumulé" value={`${digitalFolios.grandTotal?.toFixed(0) || 0} ${hotel.currencySymbol}`} />
      </div>
      {/* Le reste ci-dessous reste indicatif (marché/concurrence — aucune donnée
          externe réelle n'est intégrée en Phase 0 : pas de connecteur STR/Booking). */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard icon={DollarSign} label="ADR" value="342 DT" trend={4} />
        <KpiCard icon={TrendingUp} label="RevPAR" value="298 DT" trend={6} />
        <KpiCard icon={Users} label="Occupation moy. 7j" value="83%" trend={2} />
        <KpiCard icon={BarChart3} label="Segment Affaires" value="42%" sub="31% loisirs, 27% résidents" />
      </div>

      <div>
        <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2">Prévision d'occupation — 7 jours</h4>
        <GlassCard className="p-4">
          <div className="flex items-end justify-between gap-2 h-28">
            {FORECAST_7D.map(d => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-md" style={{ height: `${(d.occ / maxOcc) * 90}px`, background: `linear-gradient(180deg, ${gold}, ${goldDark})` }} />
                <p className="text-white/40 text-[10px]">{d.day}</p>
                <p className="text-white text-[10px] font-bold">{d.occ}%</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div>
        <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2">Comparaison marché (STR Comp Set)</h4>
        <div className="space-y-2">
          {COMP_SET.map(c => (
            <GlassCard key={c.name} className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className={`text-xs font-medium ${c.name === "Notre hôtel" ? "" : "text-white/60"}`} style={c.name === "Notre hôtel" ? { color: gold } : {}}>{c.name}</p>
                <p className="text-white/50 text-[10px]">ADR {c.adr} • RevPAR {c.revpar}</p>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(c.adr / maxComp) * 100}%`, background: c.name === "Notre hôtel" ? gold : "rgba(255,255,255,0.25)" }} />
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODULE 10 — SERRURES ÉLECTRONIQUES CONNECTÉES
// ─────────────────────────────────────────────────────────────
function SmartLocksPanel({ t, appState, setAppState }) {
  const locks = appState.smartLocks || SMART_LOCKS;

  const toggleLock = (room) => setAppState(prev => ({
    ...prev,
    smartLocks: (prev.smartLocks || SMART_LOCKS).map(l => l.room === room ? { ...l, locked: !l.locked, lastAccess: "à l'instant — Réceptionniste (à distance)" } : l),
  }));

  const issueKey = (room) => setAppState(prev => ({
    ...prev,
    smartLocks: (prev.smartLocks || SMART_LOCKS).map(l => l.room === room ? { ...l, lastAccess: "à l'instant — Clé virtuelle émise vers le mobile du client" } : l),
    auditLog: [{ id: `al_${Date.now()}`, action: `Clé virtuelle émise — Chambre ${room}`, time: "à l'instant" }, ...(prev.auditLog || [])],
  }));

  return (
    <div className="space-y-2">
      {locks.map(l => (
        <GlassCard key={l.room} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white font-semibold text-sm flex items-center gap-2"><Key size={14} style={{ color: gold }} />Chambre {l.room}</p>
            <div className="flex items-center gap-1.5">
              <Gauge size={12} className={l.battery < 20 ? "text-red-400" : "text-white/30"} />
              <span className={`text-xs ${l.battery < 20 ? "text-red-400" : "text-white/40"}`}>{l.battery}%</span>
            </div>
          </div>
          <p className="text-white/40 text-[11px] mb-3">{l.lastAccess}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => toggleLock(l.room)} className="flex-1 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1" style={l.locked ? { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" } : { background: "rgba(16,185,129,0.15)", color: "#34d399" }}>
              <Key size={11} />{l.locked ? "Verrouillée" : "Déverrouillée"}
            </button>
            <button onClick={() => issueKey(l.room)} className="flex-1 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1" style={{ background: "rgba(212,175,55,0.15)", color: gold }}>
              <Send size={11} />Émettre clé virtuelle
            </button>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODULE 11 — GESTION DES STOCKS F&B & POS
// ─────────────────────────────────────────────────────────────
function FnBStockPanel({ t, appState, setAppState }) {
  const stock = appState.fnbStock || FNB_STOCK;
  const liveOrders = appState.liveOrders || [];

  const restock = (id) => setAppState(prev => ({
    ...prev,
    fnbStock: (prev.fnbStock || FNB_STOCK).map(s => s.id === id ? { ...s, qty: s.qty + Math.round(s.threshold * 1.5) } : s),
  }));

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2 flex items-center gap-1"><Boxes size={12} />Inventaire</h4>
        <div className="space-y-2">
          {stock.map(s => {
            const low = s.qty < s.threshold;
            return (
              <GlassCard key={s.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{s.name}</p>
                  <p className="text-white/40 text-xs">{s.category} • seuil {s.threshold} {s.unit}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${low ? "text-red-400" : "text-white"}`}>{s.qty} {s.unit}</p>
                  {low && <button onClick={() => restock(s.id)} className="text-[10px] px-2 py-0.5 rounded-lg mt-1" style={{ background: "rgba(212,175,55,0.15)", color: gold }}>Réapprovisionner</button>}
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2 flex items-center gap-1"><ShoppingBag size={12} />Flux POS temps réel</h4>
        {liveOrders.length === 0 ? (
          <GlassCard className="p-5 text-center text-white/40 text-sm">Aucune commande active.</GlassCard>
        ) : (
          <div className="space-y-2">
            {liveOrders.map(o => (
              <GlassCard key={o.id} className="p-3">
                <p className="text-white text-xs font-medium">{o.guest} — {t.room} {o.room}</p>
                <p className="text-white/40 text-[11px]">{o.items.join(", ")}</p>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODULE 12 — RÔLES, PERMISSIONS & AUDIT TRAIL
// ─────────────────────────────────────────────────────────────
function RolesAudit({ t, appState, staffAuth, staffHotelId }) {
  const [subTab, setSubTab] = useState("roles");
  const [query, setQuery] = useState("");
  const [openDepts, setOpenDepts] = useState({ "Direction Générale": true });
  const auditLog = appState.auditLog || [];

  // ── Comptes staff réels (backend) — réservé gm/super_admin ──
  const [realStaff, setRealStaff] = useState(null); // null = pas encore chargé / pas autorisé
  const [staffFormOpen, setStaffFormOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({ email: "", password: "", role: "reception", name: "" });
  const [staffFormError, setStaffFormError] = useState(null);
  const [staffFormLoading, setStaffFormLoading] = useState(false);
  // MIGRATION SÉCURITÉ : plus un JWT, juste un booléen "session staff active"
  // (le token lui-même vit en cookie HttpOnly, illisible en JS) — cf. staffToken.
  const token = staffAuth?.staff ? true : null;
  const canManageStaff = staffAuth?.staff?.role === "gm" || staffAuth?.staff?.role === "super_admin";

  const refreshRealStaff = () => {
    if (!token || !staffHotelId || !canManageStaff) return;
    staffApi.listStaff(staffHotelId).then(res => setRealStaff(res.staff || [])).catch(() => setRealStaff([]));
  };
  useEffect(() => { refreshRealStaff(); }, [token, staffHotelId, canManageStaff]);

  const submitStaffForm = async () => {
    setStaffFormLoading(true);
    setStaffFormError(null);
    try {
      await staffApi.createStaff(staffHotelId, staffForm);
      setStaffForm({ email: "", password: "", role: "reception", name: "" });
      setStaffFormOpen(false);
      refreshRealStaff();
    } catch (e) {
      setStaffFormError(e.message || "Création impossible");
    } finally {
      setStaffFormLoading(false);
    }
  };

  const removeStaff = async (staffId) => {
    if (!token || !staffHotelId) return;
    await staffApi.deleteStaff(staffHotelId, staffId).catch(() => {});
    refreshRealStaff();
  };

  const ROLE_LABELS = { reception: "Réception", gm: "Directeur Général", housekeeping: "Gouvernante", maintenance: "Maintenance", super_admin: "Super Admin" };

  // Clés réelles des 20 onglets du PMS (voir la barre d'onglets plus bas dans ce fichier).
  const allModuleKeys = ALL_PMS_MODULES;
  const moduleLabels = {
    overview: t.tabOverview, services: t.tabServices, police: t.tabPolice, checkinout: t.tabCheckInOut,
    reservations: t.tabReservations, billing: t.tabBilling, nightaudit: t.tabNightAudit, housekeeping2: t.tabHousekeeping2,
    crm: t.tabCRM, compliance: t.tabCompliance, reporting: t.tabReporting, locks: t.tabLocks, fnb: t.tabFnB,
    roles: t.tabRoles, noshow: t.tabNoShow, intelligence: t.tabIntelligence, events: t.tabEvents,
    loyalty: t.tabLoyalty, familysafety: t.tabFamilySafety, staffing: t.tabStaffing,
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? STAFF_MEMBERS.filter(u => u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q) || u.department.toLowerCase().includes(q))
    : null;

  const toggleDept = (dept) => setOpenDepts(prev => ({ ...prev, [dept]: !prev[dept] }));

  const StaffCard = ({ u }) => (
    <GlassCard key={u.id} className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <UserCog size={16} style={{ color: gold }} className="flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{u.name}</p>
          <p className="text-white/40 text-xs truncate">{u.role}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {allModuleKeys.map(m => (
          <span key={m} className="text-[10px] px-2 py-0.5 rounded-full" style={u.modules.includes(m) ? { background: "rgba(212,175,55,0.15)", color: gold } : { background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.2)" }}>
            {moduleLabels[m] || m}
          </span>
        ))}
      </div>
    </GlassCard>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setSubTab("roles")} className="flex-1 py-2 rounded-xl text-xs font-medium" style={subTab === "roles" ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>Équipe & Permissions</button>
        <button onClick={() => setSubTab("audit")} className="flex-1 py-2 rounded-xl text-xs font-medium" style={subTab === "audit" ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>Journal d'audit</button>
      </div>

      {subTab === "roles" && (
        <div className="space-y-3">
          {/* Comptes staff réels — connexion effective au backend */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white/70 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={12} style={{ color: gold }} />Comptes de connexion réels
              </h4>
              {canManageStaff && (
                <button onClick={() => setStaffFormOpen(o => !o)} className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1" style={{ background: "rgba(212,175,55,0.15)", color: gold }}>
                  <Plus size={12} />Nouveau compte
                </button>
              )}
            </div>

            {!canManageStaff ? (
              <GlassCard className="p-4 text-center text-white/40 text-xs">Réservé aux rôles Directeur Général / Super Admin — connectez-vous avec un compte GM pour gérer les comptes.</GlassCard>
            ) : (
              <>
                {staffFormOpen && (
                  <GlassCard className="p-4 mb-2 space-y-2">
                    <input value={staffForm.name} onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom affiché (ex: Amira B.)"
                      className="w-full bg-white/5 border rounded-xl px-3 py-2 text-white text-xs focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
                    <input type="email" value={staffForm.email} onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))} placeholder="Email"
                      className="w-full bg-white/5 border rounded-xl px-3 py-2 text-white text-xs focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
                    <input type="password" value={staffForm.password} onChange={e => setStaffForm(f => ({ ...f, password: e.target.value }))} placeholder="Mot de passe (8 caractères min.)"
                      className="w-full bg-white/5 border rounded-xl px-3 py-2 text-white text-xs focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
                    <select value={staffForm.role} onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))}
                      className="w-full bg-white/5 border rounded-xl px-3 py-2 text-white text-xs focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }}>
                      {Object.entries(ROLE_LABELS).map(([k, label]) => <option key={k} value={k} style={{ background: "#111" }}>{label}</option>)}
                    </select>
                    {staffFormError && <p className="text-red-400 text-[11px]">{staffFormError}</p>}
                    <GoldButton className="w-full py-2 text-xs" disabled={staffFormLoading || !staffForm.email || staffForm.password.length < 8} onClick={submitStaffForm}>
                      {staffFormLoading ? "Création…" : "Créer le compte"}
                    </GoldButton>
                  </GlassCard>
                )}

                {realStaff === null ? (
                  <GlassCard className="p-4 text-center text-white/40 text-xs">Chargement…</GlassCard>
                ) : realStaff.length === 0 ? (
                  <GlassCard className="p-4 text-center text-white/40 text-xs">Aucun compte pour l'instant</GlassCard>
                ) : (
                  <div className="space-y-2 mb-3">
                    {realStaff.map(s => (
                      <GlassCard key={s.id} className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{s.name || s.email}</p>
                          <p className="text-white/40 text-xs truncate">{s.email} • {ROLE_LABELS[s.role] || s.role}</p>
                        </div>
                        {s.id !== staffAuth?.staff?.id && (
                          <button onClick={() => removeStaff(s.id)} className="text-red-400/70 hover:text-red-400 flex-shrink-0 p-1">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </GlassCard>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <p className="text-white/40 text-[11px] mb-2">Organigramme (démo, non lié aux comptes de connexion) :</p>
          </div>

          <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
            <Search size={14} className="text-white/40 flex-shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher un collaborateur, un poste, un département..."
              className="bg-transparent text-white text-xs placeholder-white/30 outline-none w-full"
            />
            <span className="text-white/30 text-[10px] flex-shrink-0">{STAFF_MEMBERS.length} postes</span>
          </div>

          {filtered ? (
            filtered.length === 0 ? (
              <GlassCard className="p-6 text-center text-white/40 text-sm">Aucun résultat pour « {query} ».</GlassCard>
            ) : (
              <div className="space-y-2">
                {filtered.map(u => <StaffCard key={u.id} u={u} />)}
              </div>
            )
          ) : (
            <div className="space-y-2">
              {STAFF_DEPARTMENTS.map(dept => {
                const members = STAFF_MEMBERS.filter(u => u.department === dept);
                if (members.length === 0) return null;
                const isOpen = !!openDepts[dept];
                return (
                  <div key={dept}>
                    <button
                      onClick={() => toggleDept(dept)}
                      className="w-full flex items-center justify-between px-1 py-2"
                    >
                      <span className="text-white/70 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 size={12} style={{ color: gold }} />{dept}
                        <span className="text-white/30 normal-case tracking-normal">({members.length})</span>
                      </span>
                      {isOpen ? <ChevronDown size={14} className="text-white/40" /> : <ChevronRight size={14} className="text-white/40" />}
                    </button>
                    {isOpen && (
                      <div className="space-y-2 mb-2">
                        {members.map(u => <StaffCard key={u.id} u={u} />)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {subTab === "audit" && (
        auditLog.length === 0 ? (
          <GlassCard className="p-6 text-center text-white/40 text-sm">Aucune action enregistrée pour le moment. Les actions du PMS (check-in, check-out, night audit, télédéclaration, clés...) apparaîtront ici automatiquement.</GlassCard>
        ) : (
          <div className="space-y-2">
            {auditLog.map(a => (
              <div key={a.id} className="flex items-center gap-2 bg-white/5 rounded-xl p-3">
                <ListChecks size={13} style={{ color: gold }} className="flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-white text-xs truncate">{a.action}</p>
                  <p className="text-white/30 text-[10px]">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODULE 13 — NO-SHOW / ANNULATION / LISTE D'ATTENTE
// ─────────────────────────────────────────────────────────────
function NoShowWaitlist({ t, appState, setAppState, hotel }) {
  const waitlist = appState.waitlist || WAITLIST;

  const riskColor = (r) => r > 50 ? "#f87171" : r > 25 ? "#fbbf24" : "#34d399";
  const riskLabel = (r) => r > 50 ? "Élevé" : r > 25 ? "Moyen" : "Faible";

  const markNoShow = (id) => setAppState(prev => ({
    ...prev,
    reservations: (prev.reservations || RESERVATIONS).map(r => r.id === id ? { ...r, status: "cancelled" } : r),
    auditLog: [{ id: `al_${Date.now()}`, action: `No-show enregistré — réservation ${id} — frais appliqués`, time: "à l'instant" }, ...(prev.auditLog || [])],
  }));

  const notifyWaitlist = (id) => setAppState(prev => ({
    ...prev,
    waitlist: (prev.waitlist || WAITLIST).map(w => w.id === id ? { ...w, notified: true } : w),
  }));

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2 flex items-center gap-1"><Radar size={12} />Scoring de risque no-show</h4>
        <div className="space-y-2">
          {NOSHOW_RISK.map(n => (
            <GlassCard key={n.id} className="p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-white text-sm font-medium">{n.guestName}</p>
                <span className="text-xs font-bold" style={{ color: riskColor(n.risk) }}>{n.risk}% — {riskLabel(n.risk)}</span>
              </div>
              <p className="text-white/40 text-[11px] mb-2">{n.reason}</p>
              <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden mb-2">
                <div className="h-full rounded-full" style={{ width: `${n.risk}%`, background: riskColor(n.risk) }} />
              </div>
              {n.risk > 50 && (
                <button onClick={() => markNoShow(n.id)} className="text-xs px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 flex items-center gap-1">
                  <CalendarX size={11} />Marquer no-show
                </button>
              )}
            </GlassCard>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-white/70 text-xs uppercase tracking-wider mb-2">Liste d'attente</h4>
        {waitlist.length === 0 ? (
          <GlassCard className="p-5 text-center text-white/40 text-sm">Aucun client en liste d'attente.</GlassCard>
        ) : (
          <div className="space-y-2">
            {waitlist.map(w => (
              <GlassCard key={w.id} className="p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-white text-sm font-medium">{w.guestName}</p>
                  <p className="text-white/40 text-xs">{ROOM_TYPES.find(r => r.id === w.roomType)?.name} • {w.desiredDate}</p>
                </div>
                {w.notified ? <GoldBadge><Check size={10} />Notifié</GoldBadge> : (
                  <button onClick={() => notifyWaitlist(w.id)} className="text-xs px-2.5 py-1 rounded-lg flex-shrink-0" style={{ background: "rgba(212,175,55,0.15)", color: gold }}>Notifier</button>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODULES 14-20 — HUB INTELLIGENCE IA (le cœur différenciant)
// ─────────────────────────────────────────────────────────────
function IntelligenceHub({ t, appState, setAppState, hotel }) {
  const [sub, setSub] = useState("pricing");
  const guests = appState.pmsGuests || PMS_GUESTS;
  const pending = guests.filter(g => !g.checkedIn);

  const subTabs = [
    { key: "pricing", label: "Tarification live", icon: TrendingUp },
    { key: "assign", label: "Attribution IA", icon: BadgeCheck },
    { key: "risk", label: "Scoring risque", icon: Radar },
    { key: "maintenance", label: "Maintenance prédictive", icon: Wrench },
    { key: "integrity", label: "Intégrité fiches", icon: Fingerprint },
    { key: "copilot", label: "Copilotes LLM", icon: BrainCircuit },
    { key: "sustainability", label: "Durabilité", icon: Leaf },
  ];

  // Hash chainé simple pour l'intégrité des fiches police (démonstration — à remplacer par SHA-256 en production)
  const simpleHash = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
    return Math.abs(h).toString(16).padStart(8, "0");
  };
  const records = appState.policeForms || [];
  const chained = records.reduceRight((acc, r) => {
    const prevHash = acc.length ? acc[acc.length - 1].hash : "genesis";
    const hash = simpleHash(prevHash + r.id + r.idNumber + r.submittedAt);
    return [...acc, { ...r, hash, prevHash }];
  }, []).reverse();

  const assignBestRoom = (guestId) => {
    const readyRooms = (appState.rooms || ROOMS_STATUS).filter(r => r.status === "ready");
    const best = readyRooms[0];
    if (!best) return;
    setAppState(prev => ({
      ...prev,
      pmsGuests: (prev.pmsGuests || PMS_GUESTS).map(g => g.id === guestId ? { ...g, room: best.id } : g),
      auditLog: [{ id: `al_${Date.now()}`, action: `Attribution IA — ${best.id} assignée automatiquement (préférences + revenue optimal)`, time: "à l'instant" }, ...(prev.auditLog || [])],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {subTabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setSub(key)} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={sub === key ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)" }}>
            <Icon size={12} />{label}
          </button>
        ))}
      </div>

      {/* 14 — Tarification prédictive temps réel */}
      {sub === "pricing" && (
        <div className="space-y-3">
          <GlassCard className="p-4" style={{ borderColor: "rgba(212,175,55,0.3)" }}>
            <p className="text-white font-semibold text-sm mb-2 flex items-center gap-2"><TrendingUp size={15} style={{ color: gold }} />Micro-ajustement en temps réel</p>
            <p className="text-white/50 text-xs">Contrairement au yield classique (recalculé quotidiennement), ce moteur réévalue le prix affiché toutes les heures en croisant météo live, recherche en cours sur le site, et disponibilité concurrente.</p>
          </GlassCard>
          <div className="grid grid-cols-2 gap-2">
            <GlassCard className="p-3"><p className="text-white/40 text-[10px]">Recherches actives (site)</p><p className="text-white font-bold text-lg">127</p></GlassCard>
            <GlassCard className="p-3"><p className="text-white/40 text-[10px]">Prochain recalcul</p><p className="text-white font-bold text-lg">18 min</p></GlassCard>
          </div>
          <GlassCard className="p-3 flex items-center justify-between">
            <p className="text-white text-xs">Dernière décision IA</p>
            <p className="text-xs font-medium" style={{ color: "#34d399" }}>Suite Présidentielle +6% (forte demande détectée)</p>
          </GlassCard>
        </div>
      )}

      {/* 15 — Attribution de chambre par IA */}
      {sub === "assign" && (
        <div className="space-y-2">
          <p className="text-white/50 text-xs mb-2">L'IA croise les préférences apprises (mémoire client), l'optimisation du revenu et la proximité des groupes pour suggérer la meilleure chambre — au lieu d'une simple liste déroulante.</p>
          {pending.length === 0 ? (
            <GlassCard className="p-5 text-center text-white/40 text-sm">Aucun client en attente d'attribution.</GlassCard>
          ) : pending.map(g => (
            <GlassCard key={g.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-sm font-medium">{g.name}</p>
                <GoldBadge>Match {88 + (g.id.length % 10)}%</GoldBadge>
              </div>
              <p className="text-white/40 text-xs mb-3">Suggestion IA : chambre {g.room} — score basé sur préférences historiques + optimisation RevPAR.</p>
              <GoldButton onClick={() => assignBestRoom(g.id)} className="w-full text-xs py-2"><BadgeCheck size={13} />Appliquer la suggestion IA</GoldButton>
            </GlassCard>
          ))}
        </div>
      )}

      {/* 16 — Scoring de risque client */}
      {sub === "risk" && (
        <div className="space-y-2">
          {CRM_PROFILES.map(p => {
            const score = p.tier === "Black" || p.tier === "Platinum" ? 4 : p.totalStays > 3 ? 12 : 38;
            return (
              <GlassCard key={p.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{p.name}</p>
                  <p className="text-white/40 text-[11px]">{p.totalStays} séjours • LTV {p.lifetimeValue} {hotel.currencySymbol}</p>
                </div>
                <span className="text-xs font-bold" style={{ color: score < 15 ? "#34d399" : score < 30 ? "#fbbf24" : "#f87171" }}>Risque {score}%</span>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* 17 — Maintenance prédictive IoT */}
      {sub === "maintenance" && (
        <div className="space-y-2">
          {IOT_EQUIPMENT.map(eq => (
            <GlassCard key={eq.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-sm font-medium">{eq.equipment}</p>
                {eq.trend === "down" ? <TrendingDown size={14} className="text-red-400" /> : <TrendingUp size={14} className="text-emerald-400" />}
              </div>
              <p className="text-white/40 text-xs mb-2">{eq.room === "Piscine" ? "Zone" : t.room} {eq.room}</p>
              <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden mb-2">
                <div className="h-full rounded-full" style={{ width: `${eq.health}%`, background: eq.health < 40 ? "#f87171" : eq.health < 70 ? "#fbbf24" : "#34d399" }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-[10px]">Santé équipement : {eq.health}%</span>
                <span className={`text-[10px] font-medium ${eq.health < 40 ? "text-red-400" : "text-white/50"}`}>Panne prévue : {eq.predictedFailure}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* 18 — Fiche police infalsifiable (hash chaîné) */}
      {sub === "integrity" && (
        <div className="space-y-2">
          <p className="text-white/50 text-xs mb-2">Chaque fiche police est horodatée et chaînée cryptographiquement à la précédente — toute modification a posteriori casse la chaîne et devient détectable en audit.</p>
          {chained.length === 0 ? (
            <GlassCard className="p-5 text-center text-white/40 text-sm">Aucune fiche à vérifier.</GlassCard>
          ) : chained.map(r => (
            <GlassCard key={r.id} className="p-3">
              <div className="flex items-center justify-between">
                <p className="text-white text-xs font-medium">{r.firstName} {r.lastName}</p>
                <span className="flex items-center gap-1 text-emerald-400 text-[10px]"><Link2 size={10} />Intègre</span>
              </div>
              <p className="text-white/30 text-[10px] font-mono mt-1">hash: {r.hash}</p>
            </GlassCard>
          ))}
        </div>
      )}

      {/* 19 — Copilotes IA connectés à un vrai LLM */}
      {sub === "copilot" && (
        <div className="space-y-3">
          <GlassCard className="p-4" style={{ borderColor: "rgba(212,175,55,0.3)" }}>
            <p className="text-white font-semibold text-sm mb-2 flex items-center gap-2"><BrainCircuit size={15} style={{ color: gold }} />Connexion à un LLM en production</p>
            <p className="text-white/50 text-xs mb-3">Les copilotes GM / Butler / Housekeeping / Maintenance affichent actuellement des recommandations pré-écrites. Pour des réponses générées dynamiquement à partir des données live du PMS, connectez une clé API via votre backend (jamais côté client, pour des raisons de sécurité).</p>
            <div className="space-y-2">
              <input placeholder="Endpoint backend (ex: /api/copilot)" className="w-full bg-white/5 border rounded-xl px-3 py-2 text-white text-xs focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} disabled />
              <p className="text-white/30 text-[10px]">⚠ La clé API ne doit jamais être intégrée dans le code frontend — elle doit transiter par un serveur backend sécurisé qui appelle l'API du modèle.</p>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-white/40 text-xs italic">Mode démo — « D'après l'occupation actuelle et l'historique de Sofia Al-Rashid, je recommande de proposer un surclassement Junior Suite à son arrivée ce soir. »</p>
          </GlassCard>
        </div>
      )}

      {/* 20 — Score de durabilité par chambre */}
      {sub === "sustainability" && (
        <div className="space-y-2">
          <GlassCard className="p-4 flex items-center justify-between">
            <div><p className="text-white/40 text-xs">Score de durabilité de l'hôtel</p><p className="text-white font-bold text-2xl">B+</p></div>
            <Leaf size={28} className="text-emerald-400" />
          </GlassCard>
          {SUSTAINABILITY_ROOMS.map(r => (
            <GlassCard key={r.room} className="p-3 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{t.room} {r.room}</p>
                <p className="text-white/40 text-[11px]">{r.energyKwh} kWh • {r.waterL} L d'eau / jour</p>
              </div>
              <span className="text-lg font-bold" style={{ color: r.score === "A" ? "#34d399" : r.score === "B" ? "#fbbf24" : "#f87171" }}>{r.score}</span>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODULE — ÉVÉNEMENTS & BANQUETS (MICE)
// ─────────────────────────────────────────────────────────────
function EventsBanquets({ t, hotel }) {
  const [events] = useState(EVENTS_BANQUETS);
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-white font-semibold flex items-center gap-2"><Calendar size={16} style={{ color: gold }} />{t.eventsTitle}</h3>
        <p className="text-white/40 text-xs mt-1">{t.eventsSub}</p>
      </div>
      <div className="space-y-2">
        {events.map(ev => (
          <GlassCard key={ev.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-white text-sm font-semibold">{ev.name}</p>
              <span className="text-xs px-2 py-1 rounded-lg"
                style={ev.status === "confirmed" ? { background: "rgba(52,211,153,0.15)", color: "#34d399" } : { background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>
                {ev.status === "confirmed" ? t.eventStatusConfirmed : t.eventStatusPending}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
              <span className="flex items-center gap-1"><Calendar size={11} />{ev.date}</span>
              <span className="flex items-center gap-1"><MapPin size={11} />{ev.room}</span>
              <span className="flex items-center gap-1"><Users size={11} />{ev.pax} {t.eventPax}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <span className="text-white/40">{ev.roomsBlocked} {t.eventRoomsBlocked}</span>
              <span style={{ color: gold }} className="font-semibold">{t.eventDeposit} : {ev.deposit.toLocaleString()} {hotel.currencySymbol}</span>
            </div>
          </GlassCard>
        ))}
      </div>
      <GoldButton className="w-full text-sm py-2.5"><Plus size={15} />{t.newEvent}</GoldButton>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODULE — PROGRAMME DE FIDÉLITÉ / RECONNAISSANCE VIP
// ─────────────────────────────────────────────────────────────
function LoyaltyProgram({ t, appState, hotel }) {
  const guests = appState.pmsGuests || PMS_GUESTS;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-white font-semibold flex items-center gap-2"><Star size={16} style={{ color: gold }} />{t.loyaltyTitle}</h3>
        <p className="text-white/40 text-xs mt-1">{t.loyaltySub}</p>
      </div>
      <div className="space-y-2">
        {guests.map(g => {
          const tier = g.vipTier ? VIP_TIERS[g.vipTier] : null;
          return (
            <GlassCard key={g.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{g.nationality}</span>
                  <div>
                    <p className="text-white text-sm font-medium">{g.name}</p>
                    <p className="text-white/40 text-xs">{g.stays} {t.loyaltyStays}</p>
                  </div>
                </div>
                {tier ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${tier.color}22`, color: tier.color, border: `1px solid ${tier.color}55` }}>
                    {tier.label}
                  </span>
                ) : (
                  <span className="text-xs text-white/30">{t.loyaltyNoTier}</span>
                )}
              </div>
              {tier && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tier.perks.map((p, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 rounded-lg text-white/60" style={{ background: "rgba(255,255,255,0.05)" }}>{p}</span>
                  ))}
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODULE — SÉCURITÉ FAMILLES (bracelets 4G connectés en temps réel)
// ─────────────────────────────────────────────────────────────
function FamilySafetyPanel({ t, appState, hotel }) {
  const guests = appState.pmsGuests || PMS_GUESTS;
  const guestById = (id) => guests.find(g => g.id === id);
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-white font-semibold flex items-center gap-2"><Shield size={16} style={{ color: gold }} />{t.familySafetyTitle}</h3>
        <p className="text-white/40 text-xs mt-1">{t.familySafetySub}</p>
      </div>
      <div className="space-y-2">
        {BRACELETS.map(br => {
          const guest = guestById(br.guestId);
          const alert = br.status === "alert";
          return (
            <GlassCard key={br.id} className="p-4" style={alert ? { borderColor: "rgba(248,113,113,0.5)" } : {}}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: alert ? "rgba(248,113,113,0.15)" : "rgba(52,211,153,0.15)" }}>
                    <Baby size={16} style={{ color: alert ? "#f87171" : "#34d399" }} />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{br.childName}</p>
                    <p className="text-white/40 text-xs">{guest?.name} — {t.room} {br.room}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={alert ? { background: "rgba(248,113,113,0.15)", color: "#f87171" } : { background: "rgba(52,211,153,0.15)", color: "#34d399" }}>
                  {alert ? t.familySafetyAlert : t.familySafetyOk}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs mt-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div>
                  <p className="text-white/30 text-[10px]">{t.familySafetyZone}</p>
                  <p className="text-white/70 flex items-center gap-1 mt-0.5"><MapPin size={10} />{br.zone}</p>
                </div>
                <div>
                  <p className="text-white/30 text-[10px]">{t.familySafetyBattery}</p>
                  <p className="text-white/70 mt-0.5">{br.battery}%</p>
                </div>
                <div>
                  <p className="text-white/30 text-[10px]">{t.familySafetyLastPing}</p>
                  <p className="text-white/70 mt-0.5">{br.lastPing}</p>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODULE — PLANNING DE L'ÉQUIPE
// ─────────────────────────────────────────────────────────────
function StaffScheduling({ t, appState, setAppState }) {
  const schedule = appState.staffSchedule || STAFF_SCHEDULE;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // id of shift being edited, or null = new
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const DAY_OPTIONS = ["Aujourd'hui", "Demain", "Après-demain"];
  const emptyForm = { staffId: "", name: "", role: "", start: "09:00", end: "17:00", day: "Aujourd'hui" };
  const [form, setForm] = useState(emptyForm);

  const openNew = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };

  const openEdit = (s) => {
    setEditingId(s.id);
    const [start, end] = (s.shift || "").split("–").map(x => x?.trim() || "");
    setForm({ staffId: s.staffId || "", name: s.name, role: s.role, start: start || "09:00", end: end || "17:00", day: s.day });
    setModalOpen(true);
  };

  const pickStaffMember = (id) => {
    if (!id) { setForm({ ...form, staffId: "" }); return; }
    const member = STAFF_MEMBERS.find(m => m.id === id);
    setForm({ ...form, staffId: id, name: member?.name || form.name, role: member?.role || form.role });
  };

  const saveShift = () => {
    if (!form.name.trim() || !form.role.trim()) return;
    const shift = `${form.start}–${form.end}`;
    setAppState(prev => {
      const list = prev.staffSchedule || STAFF_SCHEDULE;
      if (editingId) {
        return {
          ...prev,
          staffSchedule: list.map(s => s.id === editingId ? { ...s, staffId: form.staffId || null, name: form.name, role: form.role, shift, day: form.day } : s),
          auditLog: [{ id: `al_${Date.now()}`, action: `Planning modifié — ${form.name} (${form.day}, ${shift})`, time: "à l'instant" }, ...(prev.auditLog || [])],
        };
      }
      const newShift = { id: `st_${Date.now()}`, staffId: form.staffId || null, name: form.name, role: form.role, shift, day: form.day };
      return {
        ...prev,
        staffSchedule: [newShift, ...list],
        auditLog: [{ id: `al_${Date.now()}`, action: `Créneau ajouté au planning — ${form.name} (${form.day}, ${shift})`, time: "à l'instant" }, ...(prev.auditLog || [])],
      };
    });
    setModalOpen(false);
  };

  const deleteShift = (id) => {
    const s = schedule.find(x => x.id === id);
    setAppState(prev => ({
      ...prev,
      staffSchedule: (prev.staffSchedule || STAFF_SCHEDULE).filter(x => x.id !== id),
      auditLog: s ? [{ id: `al_${Date.now()}`, action: `Créneau supprimé du planning — ${s.name} (${s.day}, ${s.shift})`, time: "à l'instant" }, ...(prev.auditLog || [])] : (prev.auditLog || []),
    }));
    setConfirmDeleteId(null);
  };

  const groupedDays = [...DAY_OPTIONS, ...Array.from(new Set(schedule.map(s => s.day).filter(d => !DAY_OPTIONS.includes(d))))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2"><CalendarClock size={16} style={{ color: gold }} />{t.staffingTitle}</h3>
          <p className="text-white/40 text-xs mt-1">{t.staffingSub}</p>
        </div>
        <GoldButton onClick={openNew} className="text-xs px-3 py-2 flex-shrink-0"><Plus size={14} />Ajouter</GoldButton>
      </div>

      {schedule.length === 0 ? (
        <GlassCard className="p-6 text-center text-white/40 text-sm">Aucun créneau planifié. Ajoutez le premier créneau du jour.</GlassCard>
      ) : (
        groupedDays.map(day => {
          const shifts = schedule.filter(s => s.day === day);
          if (shifts.length === 0) return null;
          return (
            <div key={day}>
              <h4 className="text-white/50 text-xs uppercase tracking-wider mb-2">{day} <span className="text-white/25 normal-case">({shifts.length})</span></h4>
              <div className="space-y-2">
                {shifts.map(s => (
                  <GlassCard key={s.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: "rgba(212,175,55,0.15)", color: gold }}>
                          {s.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{s.name}</p>
                          <p className="text-white/40 text-xs truncate">{s.role}</p>
                        </div>
                      </div>
                      <p className="text-xs font-semibold flex-shrink-0" style={{ color: gold }}>{s.shift}</p>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                      <button onClick={() => openEdit(s)} className="text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1" style={{ background: "rgba(212,175,55,0.1)", color: gold }}>
                        <Settings size={10} />{t.edit}
                      </button>
                      {confirmDeleteId === s.id ? (
                        <button onClick={() => deleteShift(s.id)} className="text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 bg-red-500/20 text-red-400">
                          <Check size={10} />{t.confirmDelete}
                        </button>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(s.id)} className="text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 bg-red-500/10 text-red-400">
                          <Trash2 size={10} />{t.delete}
                        </button>
                      )}
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          );
        })
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Modifier le créneau" : "Nouveau créneau"}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Collaborateur (hiérarchie)</label>
            <select value={form.staffId} onChange={e => pickStaffMember(e.target.value)}
              className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
              style={{ borderColor: "rgba(212,175,55,0.2)" }}>
              <option value="" style={{ background: "#111" }}>— Saisie libre —</option>
              {STAFF_DEPARTMENTS.map(dept => (
                <optgroup key={dept} label={dept} style={{ background: "#111" }}>
                  {STAFF_MEMBERS.filter(m => m.department === dept).map(m => (
                    <option key={m.id} value={m.id} style={{ background: "#111" }}>{m.name} — {m.role}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Nom</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
              style={{ borderColor: "rgba(212,175,55,0.2)" }} />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Poste</label>
            <input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
              style={{ borderColor: "rgba(212,175,55,0.2)" }} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-white/40 mb-1 block">Début</label>
              <input type="time" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })}
                className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
                style={{ borderColor: "rgba(212,175,55,0.2)" }} />
            </div>
            <div className="flex-1">
              <label className="text-xs text-white/40 mb-1 block">Fin</label>
              <input type="time" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })}
                className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
                style={{ borderColor: "rgba(212,175,55,0.2)" }} />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Jour</label>
            <div className="flex gap-2">
              {DAY_OPTIONS.map(d => (
                <button key={d} onClick={() => setForm({ ...form, day: d })}
                  className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                  style={form.day === d ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <GoldButton onClick={saveShift} className="w-full mt-2"><Check size={14} />{t.save}</GoldButton>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Écran de connexion staff — nécessaire pour appeler les vraies
// routes backend du PMS (Bearer token). Identifiants de démo créés
// par le seed du backend (store/memoryStore.ts) :
//   reception@ocean-a-suites.tn / password123
// ─────────────────────────────────────────────────────────────
function StaffLoginScreen({ t, onLogin, loading, error }) {
  const [email, setEmail] = useState("reception@ocean-a-suites.tn");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#080808" }}>
      <GlassCard className="p-6 w-full max-w-sm space-y-4">
        <div className="text-center">
          <ShieldCheck size={28} style={{ color: gold }} className="mx-auto mb-2" />
          <h2 className="text-white font-semibold">Connexion staff</h2>
          <p className="text-white/40 text-xs mt-1">Accès au back-office PMS de l'hôtel</p>
        </div>
        <div className="space-y-2">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
            className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe"
            className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <GoldButton className="w-full py-2.5" disabled={loading || !email || !password} onClick={() => onLogin(email, password)}>
          {loading ? "Connexion…" : "Se connecter"}
        </GoldButton>
        <p className="text-white/25 text-[10px] text-center">Démo : reception@ocean-a-suites.tn / password123</p>
      </GlassCard>
    </div>
  );
}

function HotelPMS({ t, appState, setAppState, hotel, lang, storageAvailable = true, staffAuth, onStaffLogout,
  digitalLiveFeed = { tickets: [], maintenance: [], orders: [] }, digitalActiveStays = [], digitalFolios = { folios: [], grandTotal: 0 },
  digitalPendingStays = [], onResolveTicket, onResolveMaintenance, onAdvanceOrder, onMarkPmsSynced, onDigitalCheckout }) {
  const [pmsTab, setPmsTab] = useState("overview");
  const [staffRole, setStaffRole] = useState("gm");
  const [guest360, setGuest360] = useState(null);
  const guests = appState.pmsGuests || PMS_GUESTS;
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
    return { name, room: room || s?.room || "—" };
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

      {pmsTab === "services" && <ServicesManager t={t} appState={appState} setAppState={setAppState} hotel={hotel} />}
      {pmsTab === "police" && <PoliceRecords t={t} appState={appState} />}
      {pmsTab === "checkinout" && <ManualCheckInOut t={t} appState={appState} setAppState={setAppState} hotel={hotel}
        digitalPendingStays={digitalPendingStays} digitalActiveStays={digitalActiveStays}
        onMarkPmsSynced={onMarkPmsSynced} onDigitalCheckout={onDigitalCheckout} />}
      {pmsTab === "reservations" && <ReservationsYield t={t} appState={appState} setAppState={setAppState} hotel={hotel} />}
      {pmsTab === "billing" && <BillingCenter t={t} appState={appState} setAppState={setAppState} hotel={hotel} digitalFolios={digitalFolios} />}
      {pmsTab === "nightaudit" && <NightAuditModule t={t} appState={appState} setAppState={setAppState} hotel={hotel} />}
      {pmsTab === "housekeeping2" && <HousekeepingAdvanced t={t} appState={appState} setAppState={setAppState} />}
      {pmsTab === "crm" && <CRMHub t={t} appState={appState} setAppState={setAppState} hotel={hotel} />}
      {pmsTab === "compliance" && <ComplianceCenter t={t} appState={appState} setAppState={setAppState} />}
      {pmsTab === "reporting" && <ReportingDashboard t={t} appState={appState} hotel={hotel} digitalActiveStays={digitalActiveStays} digitalFolios={digitalFolios} />}
      {pmsTab === "locks" && <SmartLocksPanel t={t} appState={appState} setAppState={setAppState} />}
      {pmsTab === "fnb" && <FnBStockPanel t={t} appState={appState} setAppState={setAppState} />}
      {pmsTab === "roles" && <RolesAudit t={t} appState={appState} staffAuth={staffAuth} staffHotelId={staffAuth?.staff?.hotelId} />}
      {pmsTab === "noshow" && <NoShowWaitlist t={t} appState={appState} setAppState={setAppState} hotel={hotel} />}
      {pmsTab === "intelligence" && <IntelligenceHub t={t} appState={appState} setAppState={setAppState} hotel={hotel} />}
      {pmsTab === "events" && <EventsBanquets t={t} hotel={hotel} />}
      {pmsTab === "loyalty" && <LoyaltyProgram t={t} appState={appState} hotel={hotel} />}
      {pmsTab === "familysafety" && <FamilySafetyPanel t={t} appState={appState} hotel={hotel} />}
      {pmsTab === "staffing" && <StaffScheduling t={t} appState={appState} setAppState={setAppState} />}

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

// ─────────────────────────────────────────────────────────────
// SUPER ADMIN CONSOLE
// ─────────────────────────────────────────────────────────────
function SuperAdmin({ t, partnerHotels = [], persistPartnerHotels, allAdminHotels, storageAvailable = true, allClientHotels = [], onOpenPMS, currentPMSHotelId = null }) {
  const [activeSection, setActiveSection] = useState("network");
  const adminHotels = allAdminHotels || ADMIN_HOTELS;
  const [modules, setModules] = useState(
    Object.fromEntries(adminHotels.map(h => [h.id, new Set(h.modules)]))
  );

  // Ré-initialise les toggles de modules quand un nouvel hôtel partenaire apparaît,
  // sans écraser les toggles déjà en place pour les hôtels existants.
  useEffect(() => {
    setModules(prev => {
      const next = { ...prev };
      adminHotels.forEach(h => { if (!next[h.id]) next[h.id] = new Set(h.modules); });
      return next;
    });
  }, [adminHotels.length]);

  const toggleModule = (hotelId, mod) => {
    setModules(prev => {
      const s = new Set(prev[hotelId]);
      s.has(mod) ? s.delete(mod) : s.add(mod);
      const next = { ...prev, [hotelId]: s };
      // Si c'est un hôtel partenaire, on persiste aussi ses modules dans le stockage durable
      const partner = partnerHotels.find(p => p.id === hotelId);
      if (partner && persistPartnerHotels) {
        persistPartnerHotels(partnerHotels.map(p => p.id === hotelId ? { ...p, modules: Array.from(s) } : p));
      }
      return next;
    });
  };

  const allModules = ["checkin", "menu", "spa", "yacht", "tennis", "golf", "events"];
  const totalMRR = adminHotels.reduce((s, h) => s + h.mrr, 0);
  const activeCount = adminHotels.filter(h => h.status === "active").length;
  const pendingCount = adminHotels.length - activeCount;

  // ── État du formulaire d'ajout / édition d'hôtel partenaire ──
  const [hotelModalOpen, setHotelModalOpen] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState(null);
  const [form, setForm] = useState(EMPTY_PARTNER_HOTEL);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const openNewHotel = () => { setEditingPartnerId(null); setForm(EMPTY_PARTNER_HOTEL); setHotelModalOpen(true); };
  const openEditHotel = (h) => { setEditingPartnerId(h.id); setForm({ ...EMPTY_PARTNER_HOTEL, ...h }); setHotelModalOpen(true); };

  const saveHotel = () => {
    if (!form.name.trim() || !persistPartnerHotels) return;
    if (editingPartnerId) {
      persistPartnerHotels(partnerHotels.map(p => p.id === editingPartnerId ? { ...p, ...form } : p));
    } else {
      const newHotel = { id: makePartnerId(form.name), ...form, guests: 0, mrr: 0, status: "pending", modules: ["checkin"] };
      persistPartnerHotels([...partnerHotels, newHotel]);
    }
    setHotelModalOpen(false);
  };

  const deleteHotel = (id) => {
    if (persistPartnerHotels) persistPartnerHotels(partnerHotels.filter(p => p.id !== id));
    setConfirmDeleteId(null);
  };

  const sections = [
    { key: "network", label: t.networkStats, icon: Globe2 },
    { key: "partners", label: "Hôtels Partenaires", icon: Building2 },
    { key: "billing", label: t.billing, icon: DollarSign },
    { key: "provisioning", label: t.provisioning, icon: Settings },
  ];

  return (
    <div className="min-h-screen px-4 py-6 space-y-6" style={{ background: "#080808" }}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,175,55,0.15)" }}>
          <Shield size={20} style={{ color: gold }} />
        </div>
        <div>
          <h2 className="text-white font-bold">{t.superAdmin}</h2>
          <p className="text-xs text-white/40">LuxePass SASU — Governance Center</p>
        </div>
      </div>

      {!storageAvailable && (
        <GlassCard className="p-3 flex items-center gap-2" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
          <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-xs">Stockage persistant indisponible dans cet environnement — les hôtels ajoutés resteront le temps de la session uniquement.</p>
        </GlassCard>
      )}

      {/* Section nav */}
      <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {sections.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveSection(key)}
            className="flex-1 flex-shrink-0 flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-xs font-medium transition-all min-w-[70px]"
            style={activeSection === key ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
            <Icon size={16} />
            <span className="text-center leading-tight">{label}</span>
          </button>
        ))}
      </div>

      {/* NETWORK STATS */}
      {activeSection === "network" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <KpiCard icon={Building2} label={t.hotels} value={activeCount} sub={`${activeCount} actifs, ${pendingCount} en attente`} />
            <KpiCard icon={Users} label={t.totalUsers} value="—" trend={0} sub="Aucune donnée réseau réelle à ce jour" />
            <KpiCard icon={BrainCircuit} label={t.aiAccuracy} value="—" trend={0} sub="OCR non branché (stub)" />
            <KpiCard icon={TrendingUp} label="Transactions LuxePass" value="—" trend={0} sub="Aucune transaction réelle à ce jour" />
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Server size={16} style={{ color: gold }} /> Architecture technique (état réel, pas de monitoring temps réel)
            </h3>
            <GlassCard className="overflow-hidden">
              {[
                { name: "Backend LuxePass (Node.js / Express)", status: "En mémoire, non hébergé", detail: "Pas de base de données persistante à ce stade" },
                { name: "IA Concierge (API Anthropic)", status: "Réel si clé API configurée", detail: "Repli automatique si absente" },
                { name: "OCR pièce d'identité", status: "Non branché", detail: "Stub — champs renvoyés vides" },
                { name: "Paiement", status: "Simulé", detail: "Jeton de démonstration, aucun PSP réel intégré" },
                { name: "Synchronisation PMS ↔ app client", status: "Polling HTTP (6s)", detail: "Pas de websocket temps réel" },
                { name: "Stockage hôtels partenaires", status: storageAvailable ? "Disponible" : "Indisponible", detail: storageAvailable ? "Stockage navigateur local" : "—" },
              ].map((srv, i, arr) => (
                <div key={srv.name} className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? "border-b" : ""}`}
                  style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${srv.status.startsWith("Réel") || srv.status === "Disponible" ? "bg-emerald-400" : "bg-amber-400"}`} />
                    <span className="text-sm text-white">{srv.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/70">{srv.status}</p>
                    <p className="text-xs text-white/30">{srv.detail}</p>
                  </div>
                </div>
              ))}
            </GlassCard>
          </div>

          {/* Synchronisation PMS ↔ Super Admin — accès direct au PMS de chaque hôtel */}
          <div>
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Hotel size={16} style={{ color: gold }} /> Aperçu PMS par établissement
            </h3>
            <div className="space-y-2">
              {allClientHotels.map(h => {
                const isOpen = currentPMSHotelId === h.id;
                const isPartner = partnerHotels.some(p => p.id === h.id);
                return (
                  <GlassCard key={h.id} className="p-3 flex items-center gap-3" style={isOpen ? { borderColor: "rgba(212,175,55,0.4)" } : {}}>
                    {h.image ? (
                      <img src={h.image} alt={h.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" referrerPolicy="no-referrer" onError={handleImgError} />
                    ) : (
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,175,55,0.1)" }}>
                        <Hotel size={16} style={{ color: gold }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-medium truncate">{h.name}</p>
                        {isPartner && <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(212,175,55,0.15)", color: gold }}>Partenaire</span>}
                      </div>
                      <p className="text-white/40 text-xs truncate">{h.location}</p>
                    </div>
                    {isOpen ? (
                      <span className="text-[10px] font-medium flex items-center gap-1 flex-shrink-0" style={{ color: gold }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: gold }} />Ouvert</span>
                    ) : (
                      <button onClick={() => onOpenPMS && onOpenPMS(h)} className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0" style={{ background: "rgba(212,175,55,0.1)", color: gold }}>
                        <ChevronRight size={12} />Voir le PMS
                      </button>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* HÔTELS PARTENAIRES — onboarding sans toucher au code */}
      {activeSection === "partners" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-white/50 text-xs max-w-[70%]">Ajoutez un nouvel hôtel partenaire — il apparaîtra automatiquement côté client, PMS et dans les autres sections admin.</p>
            <GoldButton onClick={openNewHotel} className="text-xs px-3 py-2 flex-shrink-0"><Plus size={14} />Ajouter</GoldButton>
          </div>

          {partnerHotels.length === 0 ? (
            <GlassCard className="p-6 text-center text-white/40 text-sm">Aucun hôtel partenaire ajouté pour le moment. Les hôtels de base (Oceana, Magic Resort, Radisson) restent gérés dans le code.</GlassCard>
          ) : (
            <div className="space-y-2">
              {partnerHotels.map(h => (
                <GlassCard key={h.id} className="p-4">
                  <div className="flex items-center gap-3">
                    {h.image ? (
                      <img src={h.image} alt={h.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" referrerPolicy="no-referrer" onError={handleImgError} />
                    ) : (
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,175,55,0.1)" }}>
                        <Hotel size={18} style={{ color: gold }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{h.name}</p>
                      <p className="text-white/40 text-xs truncate">{h.location}</p>
                    </div>
                    <GoldBadge>{h.status === "active" ? "Actif" : "En attente"}</GoldBadge>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                    <p className="text-white/30 text-[10px]">{h.rooms} chambres • {h.currencySymbol}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => onOpenPMS && onOpenPMS(h)} className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1" style={{ background: "rgba(212,175,55,0.15)", color: gold }}>
                        <Hotel size={11} />PMS
                      </button>
                      <button onClick={() => openEditHotel(h)} className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1" style={{ background: "rgba(212,175,55,0.1)", color: gold }}>
                        <Settings size={11} />Modifier
                      </button>
                      {confirmDeleteId === h.id ? (
                        <button onClick={() => deleteHotel(h.id)} className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 bg-red-500/20 text-red-400">
                          <Check size={11} />Confirmer
                        </button>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(h.id)} className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 bg-red-500/10 text-red-400">
                          <Trash2 size={11} />Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          <Modal open={hotelModalOpen} onClose={() => setHotelModalOpen(false)} title={editingPartnerId ? "Modifier l'hôtel" : "Nouvel hôtel partenaire"}>
            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              {[
                { key: "name", label: "Nom de l'hôtel", placeholder: "ex : Villa Azur Djerba" },
                { key: "location", label: "Localisation", placeholder: "ex : Djerba, Tunisie" },
                { key: "address", label: "Adresse complète", placeholder: "" },
                { key: "phone", label: "Téléphone", placeholder: "+216 ..." },
                { key: "email", label: "Email réservation", placeholder: "resa@..." },
                { key: "image", label: "URL Image (photo hôtel)", placeholder: "https://..." },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-white/40 mb-1 block">{f.label}</label>
                  <input value={form[f.key] || ""} placeholder={f.placeholder} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Devise</label>
                  <input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}
                    className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Symbole</label>
                  <input value={form.currencySymbol} onChange={e => setForm({ ...form, currencySymbol: e.target.value })}
                    className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Nombre de chambres</label>
                  <input type="number" value={form.rooms} onChange={e => setForm({ ...form, rooms: Number(e.target.value) || 0 })}
                    className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Étoiles</label>
                  <select value={form.stars} onChange={e => setForm({ ...form, stars: Number(e.target.value) })}
                    className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }}>
                    {[3, 4, 5].map(n => <option key={n} value={n} className="bg-black">{n} ★</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Couleur d'accent</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.accent} onChange={e => setForm({ ...form, accent: e.target.value })} className="w-10 h-10 rounded-lg bg-transparent border-0 cursor-pointer" />
                  <input value={form.accent} onChange={e => setForm({ ...form, accent: e.target.value })}
                    className="flex-1 bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Description courte</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none resize-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
              </div>
              <GoldButton onClick={saveHotel} className="w-full mt-2"><Check size={14} />{editingPartnerId ? "Enregistrer les modifications" : "Ajouter l'hôtel partenaire"}</GoldButton>
            </div>
          </Modal>
        </div>
      )}

      {/* BILLING */}
      {activeSection === "billing" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <KpiCard icon={DollarSign} label={t.mrr} value={`${totalMRR.toLocaleString()} €`} trend={18} />
            <KpiCard icon={Hash} label="Model : 6€ / nuit / client" value="6 €" sub="Collecté de façon transparente" />
          </div>
          <h3 className="text-white font-semibold">Revenus par Établissement</h3>
          {adminHotels.map(h => (
            <GlassCard key={h.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-medium text-sm">{h.name}</p>
                <GoldBadge>{h.status === "active" ? "Actif" : "En attente"}</GoldBadge>
              </div>
              <div className="flex gap-4">
                <div><p className="text-xs text-white/40">Clients actifs</p><p className="text-white font-bold">{h.guests}</p></div>
                <div><p className="text-xs text-white/40">MRR estimé</p><p className="font-bold" style={{ color: gold }}>{h.mrr} €</p></div>
                <div><p className="text-xs text-white/40">Nuitées traitées</p><p className="text-white font-bold">{Math.round(h.mrr / 6)}</p></div>
              </div>
              {h.mrr > 0 && (
                <div className="mt-3 h-1.5 rounded-full overflow-hidden bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${(h.mrr / 5000) * 100}%`, background: `linear-gradient(90deg, ${gold}, ${goldDark})` }} />
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      {/* PROVISIONING */}
      {activeSection === "provisioning" && (
        <div className="space-y-4">
          <p className="text-white/50 text-sm">Activez ou désactivez les modules fonctionnels par établissement.</p>
          {adminHotels.map(h => (
            <GlassCard key={h.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white font-semibold text-sm">{h.name}</p>
                <span className={`text-xs font-medium ${h.status === "active" ? "text-emerald-400" : "text-amber-400"}`}>
                  {h.status === "active" ? "● Actif" : "○ En attente"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {allModules.map(mod => {
                  const active = modules[h.id]?.has(mod);
                  return (
                    <button key={mod} onClick={() => toggleModule(h.id, mod)}
                      className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                      style={active ? { background: "rgba(212,175,55,0.2)", color: gold, border: `1px solid rgba(212,175,55,0.4)` } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      {active ? "✓ " : ""}{mod}
                    </button>
                  );
                })}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HOME / HOTEL SELECTION
// ─────────────────────────────────────────────────────────────
function HomeScreen({ t, onSelectHotel, lang, hotels }) {
  const list = hotels || HOTELS;
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, #080808 0%, #111 60%, #0a0a0a 100%)" }}>
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        {/* Logo SVG */}
        <div className="mb-8">
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
            <circle cx="36" cy="36" r="35" stroke={gold} strokeWidth="1.5" />
            <path d="M36 14L42 28H58L46 37L50 52L36 43L22 52L26 37L14 28H30L36 14Z" fill={gold} fillOpacity="0.9" />
            <circle cx="36" cy="36" r="6" fill="none" stroke={gold} strokeWidth="1" opacity="0.4" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2" style={{ color: gold, fontFamily: "'Georgia', serif" }}>LuxePass</h1>
        <div className="w-16 h-px my-4" style={{ background: gold, opacity: 0.4 }} />
        <p className="text-white text-lg font-light max-w-sm leading-relaxed mb-2">{t.tagline}</p>
        <p className="text-white/40 text-sm">{t.subtitle}</p>
      </div>

      {/* Hotel Selection */}
      <div className="px-4 pb-10">
        <p className="text-center text-white/50 text-sm mb-4 uppercase tracking-widest">{t.selectHotel}</p>
        <div className="space-y-3 max-w-sm mx-auto">
          {list.map(hotel => (
            <GlassCard key={hotel.id} onClick={() => onSelectHotel(hotel)} className="overflow-hidden group"
              style={{ borderColor: "rgba(212,175,55,0.2)" }}>
              <div className="relative h-32 overflow-hidden">
                <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500" referrerPolicy="no-referrer" onError={handleImgError} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }} />
                <div className="absolute bottom-0 left-0 p-3">
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: hotel.stars }).map((_, i) => <Star key={i} size={10} fill={gold} style={{ color: gold }} />)}
                  </div>
                  <p className="text-white font-bold text-sm">{hotel.name}</p>
                  <p className="text-white/60 text-xs flex items-center gap-1"><MapPin size={10} />{hotel.location}</p>
                </div>
                <div className="absolute top-3 right-3">
                  <GoldBadge>{hotel.currencySymbol}</GoldBadge>
                </div>
              </div>
              <div className="px-3 py-2.5 flex items-center justify-between">
                <p className="text-white/50 text-xs">{hotel.description}</p>
                <ChevronRight size={16} style={{ color: gold }} />
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}

// Fusionne un événement SSE individuel (voir connectLiveFeed dans
// apiClient.js) dans l'état local digitalLiveFeed : upsert par id pour
// les tickets/maintenance/commandes (créé OU mis à jour → même logique),
// simple ajout en tête pour les notes (pas de "note.updated" côté
// backend). stay.completed/stay.checked_out ne touchent aucun tableau
// ici — ces événements concernent digitalActiveStays/digitalPendingStays,
// rafraîchis via refreshPmsSideData() après les actions qui les déclenchent.
function upsertLiveFeedEvent(prev, type, data) {
  const upsertById = (list) => {
    const idx = list.findIndex((item) => item.id === data.id);
    if (idx === -1) return [data, ...list];
    const next = [...list];
    next[idx] = data;
    return next;
  };

  switch (type) {
    case "service_request.created":
    case "service_request.updated":
      return { ...prev, tickets: upsertById(prev.tickets || []) };
    case "maintenance.created":
    case "maintenance.updated":
      return { ...prev, maintenance: upsertById(prev.maintenance || []) };
    case "order.created":
    case "order.updated":
      return { ...prev, orders: upsertById(prev.orders || []) };
    case "note.added":
      return { ...prev, notes: [data, ...(prev.notes || [])] };
    default:
      return prev;
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────
export default function LuxePassApp() {
  const [lang, setLang] = useState("fr");
  const [role, setRole] = useState("client");
  const [screen, setScreen] = useState("home"); // home | checkin | dashboard
  // Bandeau « Session de séjour expirée ou invalide » (cf. STAY_AUTH_LOST_EVENT).
  const [stayNotice, setStayNotice] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [partnerHotels, setPartnerHotels] = useState([]);
  const [storageAvailable, setStorageAvailable] = useState(true);

  // ── Connexion staff (réelle, via luxepass-backend) ──
  // Nécessaire pour toutes les routes /hotels/:hotelId/... du PMS
  // (live-feed, active-stays, folios, pending-stays, police-forms,
  // pms-state). Sans token valide, ces appels échoueront en 401 —
  // c'est voulu : le staff doit s'authentifier pour voir les vraies
  // données de son hôtel.
  const [staffAuth, setStaffAuth] = useState(null); // { staff: { hotelId, email, role } }
  const [staffLoginError, setStaffLoginError] = useState(null);
  const [staffLoginLoading, setStaffLoginLoading] = useState(false);
  // true tant que GET /auth/me n'a pas répondu. MIGRATION SÉCURITÉ : le jeton
  // vit désormais dans un cookie HttpOnly (illisible en JS) — on ne peut plus
  // deviner par avance si une session existe, donc on part toujours de `true`
  // et on laisse GET /auth/me (cookie rejoué automatiquement) trancher.
  const [staffRestoring, setStaffRestoring] = useState(true);

  // true tant que GET /stays/:stayId/pass n'a pas répondu, quand un séjour
  // client est déjà en localStorage (cf. setClientStay dans CheckInFlow) :
  // évite d'afficher "Veuillez d'abord compléter votre check-in" le temps
  // de la restauration.
  const [clientRestoring, setClientRestoring] = useState(() => !!getClientStay());

  // Restauration de la session staff après un rechargement de page.
  // GET /auth/me est toujours tenté : le cookie staff_session (ou
  // staff_refresh, via le refresh automatique dans apiFetch) est rejoué
  // par le navigateur s'il existe, sinon la requête échoue simplement en
  // 401 — cas normal d'un visiteur non connecté, pas une erreur à traiter.
  // Exception : status 0 (backend injoignable) — on n'appelle pas
  // /auth/logout pour une simple coupure réseau ; l'écran de login
  // s'affiche et le staff peut retenter.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { staff } = await staffAuthApi.me();
        if (cancelled) return;
        setStaffAuth({ staff });
      } catch (e) {
        if (cancelled) return;
        // Pas de cookie staff_session/staff_refresh valide (jamais connecté,
        // session expirée...) : c'est le cas normal d'un visiteur non
        // authentifié, rien à nettoyer côté serveur dans ce cas.
        if (e?.status !== 0 && e?.status !== 401) staffAuthApi.logout();
        setStaffAuth(null);
      } finally {
        if (!cancelled) setStaffRestoring(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleStaffLogin = async (email, password) => {
    setStaffLoginLoading(true);
    setStaffLoginError(null);
    try {
      const res = await staffAuthApi.login(email, password);
      setStaffAuth(res); // { staff }
    } catch (e) {
      setStaffLoginError(e.message || "Connexion impossible");
    } finally {
      setStaffLoginLoading(false);
    }
  };

  // ── Données réelles du PMS (backend) ──
  // digitalLiveFeed (tickets/maintenance/commandes/notes) est désormais
  // alimenté en temps réel par connectLiveFeed() (SSE, voir plus bas) —
  // plus par polling. active-stays/folios/pending-stays restent en
  // polling REST classique : le flux SSE ne couvre que le live-feed du
  // hall (cf. docs/tasks/REALTIME_FEED.md §6 côté backend).
  const [digitalLiveFeed, setDigitalLiveFeed] = useState({ tickets: [], maintenance: [], orders: [], notes: [] });
  const [digitalActiveStays, setDigitalActiveStays] = useState([]);
  const [digitalFolios, setDigitalFolios] = useState({ folios: [], grandTotal: 0 });
  const [digitalPendingStays, setDigitalPendingStays] = useState([]);
  const [liveFeedConnected, setLiveFeedConnected] = useState(false);

  const staffHotelId = staffAuth?.staff?.hotelId || null;
  // MIGRATION SÉCURITÉ : ce n'est plus un JWT (illisible, en cookie HttpOnly)
  // mais un simple booléen « session staff active » — conservé sous ce nom
  // pour ne pas toucher aux ~15 gardes d'effets ci-dessous qui le testent
  // uniquement en tant que valeur truthy/falsy.
  const staffToken = staffAuth?.staff ? true : null;

  const refreshPmsSideData = async () => {
    if (!staffToken || !staffHotelId) return;
    try {
      const [stays, folios, pending] = await Promise.all([
        pmsApi.activeStays(staffHotelId),
        pmsApi.folios(staffHotelId),
        staffApi.pendingStays(staffHotelId),
      ]);
      setDigitalActiveStays(stays.stays || []);
      setDigitalFolios(folios);
      setDigitalPendingStays(pending.stays || []);
    } catch (e) {
      // Token expiré/invalide ou backend injoignable — on redemande la connexion
      if (e.status === 401) handleStaffLogout();
    }
  };

  // Poll toutes les 6s tant qu'on est connecté côté staff — seulement
  // pour active-stays/folios/pending-stays désormais (le live-feed est
  // en SSE, ci-dessous).
  useEffect(() => {
    if (!staffToken || !staffHotelId) return;
    refreshPmsSideData();
    const interval = setInterval(refreshPmsSideData, 6000);
    return () => clearInterval(interval);
  }, [staffToken, staffHotelId]);

  // Live-feed du hall (tickets/maintenance/commandes/notes) en temps réel
  // via SSE — reconnexion automatique gérée par connectLiveFeed() en cas
  // de coupure (voir apiClient.js pour le détail des 4 étapes).
  useEffect(() => {
    if (!staffToken || !staffHotelId) return;
    setLiveFeedConnected(false);

    const disconnect = connectLiveFeed(staffHotelId, {
      onSnapshot: (snapshot) => {
        setDigitalLiveFeed({
          tickets: snapshot.tickets || [],
          maintenance: snapshot.maintenance || [],
          orders: snapshot.orders || [],
          notes: snapshot.notes || [],
        });
        setLiveFeedConnected(true);
      },
      onItemUpdate: (type, data) => {
        setLiveFeedConnected(true);
        setDigitalLiveFeed((prev) => upsertLiveFeedEvent(prev, type, data));
      },
      onError: () => {
        setLiveFeedConnected(false);
      },
    });

    return () => disconnect();
  }, [staffToken, staffHotelId]);

  // Fiches police du jour (réelles) — alimente PoliceRecords sans
  // modification de ce composant (même forme que l'ancien mock).
  useEffect(() => {
    if (!staffToken || !staffHotelId) return;
    const today = new Date().toISOString().slice(0, 10);
    staffApi.policeForms(staffHotelId, today)
      .then((res) => setAppState(prev => ({ ...prev, policeForms: res.forms || [] })))
      .catch(() => {});
  }, [staffToken, staffHotelId]);

  const handleResolveTicket = async (id) => {
    if (!staffToken || !staffHotelId) return;
    // Pas de refresh manuel : la mise à jour de digitalLiveFeed arrive
    // via l'événement SSE "service_request.updated" déclenché par cette
    // route côté backend.
    await pmsApi.resolveTicket(staffHotelId, id, "done").catch(() => {});
  };
  const handleResolveMaintenance = async (id) => {
    if (!staffToken || !staffHotelId) return;
    await pmsApi.resolveMaintenance(staffHotelId, id, "done").catch(() => {});
  };
  const handleAdvanceOrder = async (id, nextStatus) => {
    if (!staffToken || !staffHotelId) return;
    await pmsApi.advanceOrderStatus(staffHotelId, id, nextStatus).catch(() => {});
  };
  const handleMarkPmsSynced = async (stayId) => {
    if (!staffToken || !staffHotelId) return;
    await staffApi.markPmsSynced(staffHotelId, stayId).catch(() => {});
    refreshPmsSideData();
  };
  const handleDigitalCheckout = async (stayId) => {
    if (!stayId || !staffToken || !staffHotelId) return;
    // Route STAFF dédiée : POST /stays/:stayId/checkout exige le stayToken du
    // client (ACTION 1, PHASE 0), que la réception ne possède pas.
    await staffApi.checkoutStay(staffHotelId, stayId).catch(() => {});
    refreshPmsSideData();
  };

  // Chargement des hôtels partenaires persistés.
  // ⚠️ Pas d'équivalent backend pour cette liste (pas de route "créer un
  // hôtel partenaire" côté luxepass-backend — c'est une fonctionnalité
  // Super Admin locale) : contrairement à pms_state ci-dessous, elle reste
  // en localStorage du navigateur, PAS partagée entre appareils/staff.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PARTNER_HOTELS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      setPartnerHotels(Array.isArray(list) ? list : []);
    } catch (e) {
      // Clé absente au premier lancement, ou localStorage indisponible
      // (navigation privée stricte, quota dépassé...)
      setStorageAvailable(false);
    }
  }, []);

  // Persiste la liste complète des hôtels partenaires (state local + localStorage)
  const persistPartnerHotels = (nextList) => {
    setPartnerHotels(nextList);
    try {
      localStorage.setItem(PARTNER_HOTELS_KEY, JSON.stringify(nextList));
    } catch (e) {
      setStorageAvailable(false);
    }
  };

  const allClientHotels = [...HOTELS, ...partnerHotels];
  const allAdminHotels = [...ADMIN_HOTELS, ...partnerHotels.map(h => ({
    id: h.id, name: h.name, guests: h.guests ?? 0, mrr: h.mrr ?? 0,
    status: h.status || "pending", modules: h.modules || ["checkin"],
  }))];

  // ── Isolation & persistance des données PMS par hôtel ──
  // Chaque hôtel (base ou partenaire) possède sa propre tranche d'état
  // (clients, chambres, réservations, folios, etc.), indexée par son id.
  // `appState` / `setAppState` gardent exactement la même API que partout
  // ailleurs dans le fichier — seule cette section change.
  const [appStateByHotel, setAppStateByHotel] = useState({});
  const currentHotelId = selectedHotel?.id || HOTELS[0].id;

  // ── Catalogue de services (public, tous rôles) — la source locale par
  // défaut est remplacée par le catalogue réellement édité par le staff
  // (PATCH /pms-state via ServicesManager), pour que le client voie les
  // vrais prix/disponibilités même depuis un autre appareil que celui du
  // staff.
  useEffect(() => {
    let cancelled = false;
    // ⚠️ La traduction (lang≠fr) ne doit s'appliquer qu'à l'affichage
    // client (commande spa/room service) — jamais côté staff, sinon
    // ServicesManager éditerait et réenregistrerait par-dessus une version
    // traduite du catalogue, corrompant la source de vérité en français.
    const effectiveLang = role === "client" ? lang : "fr";
    const fetchPublicServices = () => {
      pmsApi.publicServices(currentHotelId, effectiveLang)
        .then((res) => {
          if (cancelled || !res.services) return; // null = staff n'a encore rien édité, on garde le catalogue par défaut local
          setAppStateByHotel(prev => {
            const current = prev[currentHotelId] || createDefaultAppState();
            return { ...prev, [currentHotelId]: { ...current, services: res.services } };
          });
        })
        .catch(() => {});
    };
    fetchPublicServices();
    const interval = setInterval(fetchPublicServices, 15000); // 15s : pas besoin du même temps réel que les tickets
    return () => { cancelled = true; clearInterval(interval); };
  }, [currentHotelId, lang, role]);

  // ── Chargement de l'état PMS réel (backend, partagé entre tout le staff
  // de l'hôtel) dès qu'on est connecté — modules réservations/yield/
  // night-audit/CRM/conformité/locks/F&B/rôles/waitlist/événements/
  // fidélité/sécurité famille/planning staff. Route protégée côté serveur
  // (requireStaffAuth + rôle reception/gm/super_admin) : un visiteur
  // "client" garde simplement les valeurs par défaut (createDefaultAppState),
  // et le catalogue public "services" lui arrive séparément ci-dessus.
  const [remotePmsLoadedFor, setRemotePmsLoadedFor] = useState(null);
  useEffect(() => {
    if (!staffToken || !staffHotelId) return;
    if (remotePmsLoadedFor === staffHotelId) return;
    getPmsState(staffHotelId)
      .then((res) => {
        setAppStateByHotel(prev => ({
          ...prev,
          [currentHotelId]: { ...createDefaultAppState(), ...(prev[currentHotelId] || {}), ...(res.state || {}) },
        }));
        setRemotePmsLoadedFor(staffHotelId);
      })
      .catch(() => {});
  }, [staffToken, staffHotelId, currentHotelId, remotePmsLoadedFor]);

  const appState = appStateByHotel[currentHotelId] || createDefaultAppState();

  // Débounce l'envoi au backend pour ne pas spammer une requête PATCH à
  // chaque frappe/clic (les modules PMS appellent setAppState très souvent).
  const pmsPatchTimer = useRef(null);
  const setAppState = (updater) => {
    setAppStateByHotel(prev => {
      const current = prev[currentHotelId] || createDefaultAppState();
      const updated = typeof updater === "function" ? updater(current) : updater;

      // Synchronise vers le backend (partagé entre tout le staff) les
      // sections gérées par pmsStateStore côté serveur.
      if (staffToken && staffHotelId === currentHotelId) {
        if (pmsPatchTimer.current) clearTimeout(pmsPatchTimer.current);
        pmsPatchTimer.current = setTimeout(() => {
          const patch = {};
          PMS_STATE_KEYS.forEach((key) => {
            if (updated[key] !== undefined) patch[key] = updated[key];
          });
          if (Object.keys(patch).length > 0) {
            updatePmsState(staffHotelId, patch).catch(() => {});
          }
        }, 800);
      }

      return { ...prev, [currentHotelId]: updated };
    });
  };

  // Restauration du séjour client après rechargement de page (P1 §2.1) :
  // si un stayId est en localStorage (posé par CheckInFlow à la fin du
  // check-in), on rappelle GET /stays/:stayId/pass pour reconstituer un
  // guest minimal (nom, chambre, QR frais) sans repasser par le check-in.
  // En cas de séjour clôturé (checked_out) ou d'introuvable (404/410), on
  // efface la clé et on laisse l'écran d'accueil s'afficher normalement.
  useEffect(() => {
    const saved = getClientStay();
    if (!saved?.stayId) return;
    let cancelled = false;
    (async () => {
      try {
        const pass = await stayApi.getPass(saved.stayId);
        if (cancelled) return;
        if (pass.status === "checked_out") {
          clearClientStay();
          return;
        }
        const restoredHotel = allClientHotels.find(h => h.id === saved.hotelId) || HOTELS[0];
        const [firstName, ...rest] = (pass.guestName || "").split(" ");
        const qrPayload = encodeQrPayload({ stayId: pass.stayId, qrToken: pass.qrToken });
        // /pass renvoie un stayToken frais (null si le séjour est clos) : on le
        // garde, sinon on conserve l'ancien.
        const restoredStayToken = pass.stayToken || saved.stayToken;
        setClientStay({
          stayId: pass.stayId,
          qrToken: pass.qrToken,
          hotelId: restoredHotel.id,
          stayToken: restoredStayToken,
        });

        setSelectedHotel(restoredHotel);
        setAppStateByHotel(prev => {
          const current = prev[restoredHotel.id] || createDefaultAppState();
          return {
            ...prev,
            [restoredHotel.id]: {
              ...current,
              guest: {
                ...(current.guest || {}),
                firstName: firstName || "",
                lastName: rest.join(" "),
                hotel: restoredHotel,
                stayId: pass.stayId,
                qrToken: pass.qrToken,
                stayToken: restoredStayToken,
                qrPayload,
                room: pass.room,
                guestId: current.guest?.guestId || `g_${pass.stayId}`,
              },
            },
          };
        });
        setRole("client");
        setScreen("dashboard");
      } catch (err) {
        // Séjour introuvable/clôturé (404/410) : on nettoie la clé. Sur une
        // simple erreur réseau (status 0, backend injoignable au
        // démarrage), on la laisse en place pour retenter au prochain
        // montage plutôt que de faire perdre le séjour au client.
        if (!cancelled && err?.status !== 0) clearClientStay();
      } finally {
        if (!cancelled) setClientRestoring(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Séjour client perdu (stayToken absent, expiré ou refusé — 401/403 — par le
  // backend) : apiClient a déjà effacé les clés locales. On retire le guest de
  // l'état, on affiche le message « Session de séjour expirée ou invalide » et
  // on renvoie le client à l'écran de check-in de son hôtel (à l'accueil si
  // aucun hôtel n'est encore sélectionné), plutôt que de laisser un dashboard
  // dont toutes les requêtes échouent en silence (les polling font
  // .catch(() => {})). Le ref évite de capturer un selectedHotel périmé.
  const selectedHotelRef = useRef(null);
  selectedHotelRef.current = selectedHotel;
  useEffect(() => {
    const onStayAuthLost = () => {
      setAppStateByHotel(prev =>
        Object.fromEntries(Object.entries(prev).map(([hotelId, st]) => [hotelId, { ...st, guest: null }]))
      );
      setStayNotice(true);
      setScreen(selectedHotelRef.current ? "checkin" : "home");
    };
    window.addEventListener(STAY_AUTH_LOST_EVENT, onStayAuthLost);
    return () => window.removeEventListener(STAY_AUTH_LOST_EVENT, onStayAuthLost);
  }, []);

  // Déconnexion staff complète : demande au backend d'effacer les cookies
  // staff_session/staff_refresh (staffAuthApi.logout — un cookie HttpOnly ne
  // peut pas être effacé depuis ce fichier), remet à zéro l'état d'auth et
  // les données PMS du staff (sinon elles resteraient affichées / ne
  // seraient pas rechargées à la reconnexion). Le SSE se ferme via le
  // cleanup de l'effet dépendant de staffToken. L'état local est remis à
  // zéro même si l'appel réseau échoue (cf. staffAuthApi.logout).
  const handleStaffLogout = async () => {
    await staffAuthApi.logout();
    setStaffAuth(null);
    setStaffLoginError(null);
    setDigitalLiveFeed({ tickets: [], maintenance: [], orders: [], notes: [] });
    setDigitalActiveStays([]);
    setDigitalFolios({ folios: [], grandTotal: 0 });
    setDigitalPendingStays([]);
    setLiveFeedConnected(false);
    setRemotePmsLoadedFor(null);
  };

  const t = i18n[lang];
  const isRTL = t.dir === "rtl";

  const handleSelectHotel = (hotel) => {
    setSelectedHotel(hotel);
    setScreen("checkin");
  };

  const handleCheckInComplete = () => {
    setStayNotice(false);
    setScreen("dashboard");
  };

  // Bascule vers le rôle PMS scopé sur un hôtel donné (utilisé depuis Super Admin)
  const handleOpenHotelPMS = (hotel) => {
    setSelectedHotel(hotel);
    setRole("pms");
  };

  const roles = [
    { key: "client", label: t.clientPortal, icon: User },
    { key: "pms", label: t.hotelPMS, icon: Hotel },
    { key: "admin", label: t.superAdmin, icon: Shield },
  ];

  const langs = [
    { key: "fr", label: "FR" },
    { key: "en", label: "EN" },
    { key: "ar", label: "ع" },
  ];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen text-white" style={{ background: "#080808", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ROLE & LANGUAGE SWITCHER BAR */}
      <div className="sticky top-0 z-50 border-b" style={{ background: "rgba(5,5,5,0.97)", backdropFilter: "blur(24px)", borderColor: "rgba(212,175,55,0.12)" }}>
        <div className="flex items-center justify-between px-3 py-2 gap-2">
          {/* Role switcher */}
          <div className="flex gap-1 flex-1 min-w-0">
            {roles.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setRole(key)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all truncate"
                style={role === key ? { background: `rgba(212,175,55,0.15)`, color: gold, border: `1px solid rgba(212,175,55,0.4)` } : { background: "transparent", color: "rgba(255,255,255,0.4)", border: "1px solid transparent" }}>
                <Icon size={12} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Lang switcher */}
          <div className="flex gap-1 flex-shrink-0">
            {langs.map(l => (
              <button key={l.key} onClick={() => setLang(l.key)}
                className="w-8 h-7 rounded-lg text-xs font-bold transition-all"
                style={lang === l.key ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      {role === "client" && (
        <>
          {stayNotice && screen !== "dashboard" && (
            <div role="alert" className="mx-3 mt-3 px-4 py-3 rounded-xl flex items-start justify-between gap-3 text-sm"
              style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.35)", color: "#fca5a5" }}>
              <span>{t.stayExpired}</span>
              <button onClick={() => setStayNotice(false)} aria-label="Fermer" className="flex-shrink-0 opacity-70 hover:opacity-100">✕</button>
            </div>
          )}
          {screen === "home" && !clientRestoring && <HomeScreen t={t} onSelectHotel={handleSelectHotel} lang={lang} hotels={allClientHotels} />}
          {screen === "checkin" && selectedHotel && (
            <CheckInFlow t={t} hotel={selectedHotel} onComplete={handleCheckInComplete} appState={appState} setAppState={setAppState} />
          )}
          {screen === "dashboard" && appState.guest && (
            <ClientDashboard t={t} guest={appState.guest} hotel={selectedHotel || HOTELS[0]} lang={lang} appState={appState} setAppState={setAppState} onLeaveStay={clearClientStay} />
          )}
          {screen === "home" && clientRestoring && (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "#080808" }}>
              <RefreshCw size={22} className="animate-spin" style={{ color: gold }} />
            </div>
          )}
          {screen === "dashboard" && !appState.guest && !clientRestoring && (
            <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
              <div className="text-center">
                <p className="text-white/50 mb-4">Veuillez d'abord compléter votre check-in.</p>
                <GoldButton onClick={() => setScreen(selectedHotel ? "checkin" : "home")}>
                  {t.checkIn} <ChevronRight size={16} />
                </GoldButton>
              </div>
            </div>
          )}
        </>
      )}

      {role === "pms" && !staffAuth && staffRestoring && (
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#080808" }}>
          <RefreshCw size={22} className="animate-spin" style={{ color: gold }} />
        </div>
      )}
      {role === "pms" && !staffAuth && !staffRestoring && (
        <StaffLoginScreen t={t} onLogin={handleStaffLogin} loading={staffLoginLoading} error={staffLoginError} />
      )}
      {role === "pms" && staffAuth && (
        <HotelPMS t={t} appState={appState} setAppState={setAppState} hotel={selectedHotel || HOTELS[0]} lang={lang}
          storageAvailable={storageAvailable} staffAuth={staffAuth} onStaffLogout={handleStaffLogout}
          digitalLiveFeed={digitalLiveFeed} digitalActiveStays={digitalActiveStays}
          digitalFolios={digitalFolios} digitalPendingStays={digitalPendingStays}
          liveFeedConnected={liveFeedConnected}
          onResolveTicket={handleResolveTicket} onResolveMaintenance={handleResolveMaintenance}
          onAdvanceOrder={handleAdvanceOrder} onMarkPmsSynced={handleMarkPmsSynced}
          onDigitalCheckout={handleDigitalCheckout} />
      )}

      {role === "admin" && (
        <SuperAdmin t={t} partnerHotels={partnerHotels} persistPartnerHotels={persistPartnerHotels}
          allAdminHotels={allAdminHotels} storageAvailable={storageAvailable}
          allClientHotels={allClientHotels} onOpenPMS={handleOpenHotelPMS}
          currentPMSHotelId={selectedHotel?.id || null} />
      )}
    </div>
  );
}
