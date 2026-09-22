// ─────────────────────────────────────────────────────────────
// menu.js — carte F&B (MENU_ITEMS) et demandes rapides de chambre (ROOM_REQUESTS).
// Extrait tel quel de l'ancien components/common/constants.js — aucune valeur modifiée.
// ─────────────────────────────────────────────────────────────
import { Baby, Bath, Bed, Coffee, Droplets, Leaf, Scissors, Shirt, Snowflake, Umbrella, Utensils, Wind, Wine } from "lucide-react";
import { OCEANA_GALLERY } from "./hotels";

export const MENU_CATEGORY_ORDER = ["Entrées", "Plats", "Pizzas & Pâtes", "Desserts", "Boissons Chaudes", "Boissons Fraîches", "Cocktails & Bar"];

export const MENU_ITEMS = [
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

export const ROOM_REQUESTS = [
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
