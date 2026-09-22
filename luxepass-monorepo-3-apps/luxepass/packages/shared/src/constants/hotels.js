// ─────────────────────────────────────────────────────────────
// hotels.js — configuration des hôtels (Oceana…), galerie, hôtels partenaires du Super Admin.
// Extrait tel quel de l'ancien components/common/constants.js — aucune valeur modifiée.
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// HOTEL CONFIGS
// ─────────────────────────────────────────────────────────────
export const HOTELS = [
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
export const MOCK_GUEST = {
  firstName: "Sofia", lastName: "Al-Rashid", age: 34, gender: "F",
  idNumber: "TN-2891-4567", profession: "Architecte",
  from: "Dubaï, Émirats Arabes Unis", destination: "Paris, France",
  arrival: "2026-06-11", departure: "2026-06-18",
};

// Galerie photo officielle Oceana Hotel & Spa — hoteloceanasuites.tn/fr-fr/photos/
export const OCEANA_GALLERY = {
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
export const RESTAURANTS_OCEANA = [
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

export const ADMIN_HOTELS = [
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
export const PARTNER_HOTELS_KEY = "luxepass_partner_hotels";

export const makePartnerId = (name) =>
  "p_" + name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "").slice(0, 30) + "_" + Date.now().toString(36);

export const EMPTY_PARTNER_HOTEL = {
  name: "", location: "", address: "", phone: "", email: "",
  currency: "TND", currencySymbol: "DT", accent: "#D4AF37",
  image: "", stars: 5, description: "", rooms: 100,
};
