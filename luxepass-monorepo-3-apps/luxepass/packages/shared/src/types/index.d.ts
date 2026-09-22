// ─────────────────────────────────────────────────────────────
// Types partagés — préparation du passage progressif à TypeScript.
//
// Usage aujourd'hui (fichiers .js/.jsx, sans rien changer à l'exécution) :
//   /** @type {import("../types").Guest} */
// et, fichier par fichier, `// @ts-check` en tête pour activer la vérification.
// Ces types sont volontairement souples (Record<string, any>) là où la forme
// exacte n'est pas encore figée : on les resserre au fil de la migration.
// ─────────────────────────────────────────────────────────────

export type Lang = "fr" | "en" | "ar";
export type Role = "client" | "pms" | "admin";
export type Screen = "home" | "checkin" | "dashboard";

/** Dictionnaire de traductions d'une langue (clés = i18n/index.js). */
export type Dictionary = Record<string, any> & { dir: "ltr" | "rtl" };

export interface Hotel {
  id: string;
  name: string;
  location?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  lat?: number;
  lng?: number;
  currency: string;
  currencySymbol: string;
  accent?: string;
  image?: string;
  logo?: string;
  stars?: number;
  description?: string;
  rooms?: number;
  restaurants?: string[];
  bars?: string[];
  [extra: string]: any;
}

export interface StaffUser {
  hotelId: string;
  email: string;
  role: string;
}
export interface StaffAuth {
  staff: StaffUser;
}

/** Invité du séjour en cours (posé par CheckInFlow / hooks/useStay.js). */
export interface Guest {
  firstName: string;
  lastName: string;
  guestId: string;
  hotel: Hotel;
  stayId: string;
  stayToken?: string | null;
  qrToken?: string;
  qrPayload?: string;
  room?: string;
  [extra: string]: any;
}

/** État PMS d'un hôtel (voir createDefaultAppState() dans constants/pmsDemo.js). */
export interface AppState {
  guest: Guest | null;
  pmsGuests: any[];
  rooms: any[];
  services: any[];
  reservations: any[];
  policeForms: any[];
  folios: Record<string, number>;
  memories: Record<string, any[]>;
  [section: string]: any;
}
export type AppStateUpdater = AppState | ((prev: AppState) => AppState);

export interface LiveFeed {
  tickets: any[];
  maintenance: any[];
  orders: any[];
  notes: any[];
}

// ── Valeurs des contextes (contexts/*.jsx → hooks/use*.js) ──
export interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dictionary;
  isRTL: boolean;
}

export interface AuthContextValue {
  staffAuth: StaffAuth | null;
  staffHotelId: string | null;
  /** Booléen « session staff active » (le vrai jeton est un cookie HttpOnly). */
  staffToken: true | null;
  staffRestoring: boolean;
  staffLoginError: string | null;
  staffLoginLoading: boolean;
  loginStaff: (email: string, password: string) => Promise<void>;
  logoutStaff: () => Promise<void>;
  clientRestoring: boolean;
  setClientRestoring: (v: boolean) => void;
  clearClientStay: () => void;
}

export interface AppStateContextValue {
  role: Role;
  setRole: (r: Role) => void;
  screen: Screen;
  setScreen: (s: Screen) => void;
  stayNotice: boolean;
  setStayNotice: (v: boolean) => void;
  selectedHotel: Hotel | null;
  setSelectedHotel: (h: Hotel | null) => void;
  currentHotelId: string;
  partnerHotels: Hotel[];
  persistPartnerHotels: (list: Hotel[]) => void;
  allClientHotels: Hotel[];
  allAdminHotels: any[];
  storageAvailable: boolean;
  appState: AppState;
  setAppState: (updater: AppStateUpdater) => void;
  setAppStateByHotel: (updater: (prev: Record<string, AppState>) => Record<string, AppState>) => void;
  selectHotel: (hotel: Hotel) => void;
  completeCheckIn: () => void;
  openHotelPMS: (hotel: Hotel) => void;
}

export interface LiveFeedContextValue {
  digitalLiveFeed: LiveFeed;
  liveFeedConnected: boolean;
  digitalActiveStays: any[];
  digitalFolios: { folios: any[]; grandTotal: number };
  digitalPendingStays: any[];
  refreshPmsSideData: () => Promise<void>;
}

export interface StaffActions {
  resolveTicket: (id: string) => Promise<void>;
  resolveMaintenance: (id: string) => Promise<void>;
  advanceOrder: (id: string, nextStatus: string) => Promise<void>;
  markPmsSynced: (stayId: string) => Promise<void>;
  digitalCheckout: (stayId: string) => Promise<void>;
}

export type IncidentType = "ac" | "wifi" | "plumbing" | "elec" | "cleaning" | "other";

/** Rapport produit par le signalement maintenance (transmis à pushMaintenance). */
export interface IncidentReport {
  equipment: string;
  issue: string;
  solution: string;
  ticket: string;
  photo: string | null;
}

/** Valeur retournée par hooks/useMaintenance.js. */
export interface UseMaintenanceValue {
  incidentText: string;
  setIncidentText: (updater: string | ((prev: string) => string)) => void;
  incidentAnalyzing: boolean;
  incidentReport: IncidentReport | null;
  incidentType: string | null;
  setIncidentType: (type: string | null) => void;
  incidentPhoto: string | null;
  incidentPhotoRef: { current: HTMLInputElement | null };
  micListening: boolean;
  analyzeIncident: (type?: string) => void;
  resetIncident: () => void;
  startVoiceInput: () => void;
  handlePhotoSelect: (e: { target: { files?: FileList | null } }) => void;
}

/** Suivi des demandes du séjour (GET service-requests / maintenance-reports). */
export interface MyRequests {
  requests: any[];
  reports: any[];
}

/** Valeur retournée par hooks/useServiceRequests.js. */
export interface UseServiceRequestsValue {
  myRequests: MyRequests;
  refreshMyRequests: () => void;
  pushTicket: (req: string, priority?: "LOW" | "MED" | "HIGH", price?: number) => Promise<void>;
  pushMaintenance: (report: IncidentReport) => Promise<void>;
  actionError: string | null;
  setActionError: (error: string | null) => void;
  actionSubmitting: boolean;
  setActionSubmitting: (submitting: boolean) => void;
}

export interface MemoryNote {
  id: string;
  fr: string;
  en: string;
  ar: string;
  backendSynced?: boolean;
}

/** Valeur retournée par useConciergeMemory (hooks/useConcierge.js). */
export interface UseConciergeMemoryValue {
  memory: MemoryNote[];
  addMemoryNote: (entry: MemoryNote) => void;
  clearMemory: () => void;
}

export interface ChatMessage {
  from: "ai" | "user" | "system" | "human";
  text: string;
}

/** Valeur retournée par useConcierge (hooks/useConcierge.js). */
export interface UseConciergeValue {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  typing: boolean;
  handoff: "none" | "transferring" | "connected";
  memoryOpen: boolean;
  setMemoryOpen: (open: boolean) => void;
  exploreOpen: boolean;
  setExploreOpen: (open: boolean) => void;
  itinerary: string[] | null;
  send: () => void;
  startHandoff: () => void;
  generateItinerary: () => void;
  handleClearMemory: () => void;
  handleCityBooked: (place: { name: string }) => void;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  [extra: string]: any;
}

/** Valeur retournée par hooks/useOrders.js. */
export interface UseOrdersValue {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "qty">) => void;
  cartTotal: number;
  orderPlaced: boolean;
  setOrderPlaced: (placed: boolean) => void;
  qrPayModal: boolean;
  setQrPayModal: (open: boolean) => void;
  orderSubmitting: boolean;
  orderError: string | null;
  handleConfirmOrder: () => Promise<void>;
  paymentModal: boolean;
  paymentClientSecret: string | null;
  paymentIdInFlight: string | null;
  paymentInitLoading: boolean;
  paymentInitError: string | null;
  paymentSettling: boolean;
  paymentSettleError: string | null;
  startCardPayment: () => Promise<void>;
  closePaymentModal: () => void;
  pollPaymentUntilSettled: (paymentId: string) => Promise<void>;
  folio: { orders: any[]; folioTotal: number };
  refreshFolio: () => void;
}

export interface CheckInGuestData {
  firstName: string; lastName: string; age: string | number; gender: string; idNumber: string;
  profession: string; from: string; destination: string; arrival: string; departure: string; occupants: number;
}

export interface CardInput { number: string; holder: string; expiry: string; cvv: string }

/** Valeur retournée par hooks/useCheckIn.js. */
export interface UseCheckInValue {
  step: number;
  setStep: (step: number) => void;
  initializing: boolean;
  initError: string | null;
  scanning: boolean;
  scanned: boolean;
  scanError: string | null;
  handleFileSelected: (e: { target: { files?: FileList | null } }) => Promise<void>;
  guestData: CheckInGuestData;
  setGuestData: (updater: CheckInGuestData | ((prev: CheckInGuestData) => CheckInGuestData)) => void;
  guestDataError: string | null;
  handleConfirmGuestData: () => Promise<void>;
  signature: string | null;
  setSignature: (data: string | null) => void;
  signatureError: string | null;
  handleConfirmSignature: () => Promise<void>;
  card: CardInput;
  setCard: (updater: CardInput | ((prev: CardInput) => CardInput)) => void;
  conciergeOptIn: boolean;
  setConciergeOptIn: (optIn: boolean) => void;
  conciergeAdded: number | null;
  qrPayload: string | null;
  stayId: string | null;
  room: string | null;
  paymentError: string | null;
  generateQR: () => Promise<void>;
  submitting: boolean;
}
