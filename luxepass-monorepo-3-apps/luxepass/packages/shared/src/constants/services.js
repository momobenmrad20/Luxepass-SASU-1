// ─────────────────────────────────────────────────────────────
// services.js — catalogue de services/spa, partenaires externes, événements & mémoire du concierge.
// Extrait tel quel de l'ancien components/common/constants.js — aucune valeur modifiée.
// ─────────────────────────────────────────────────────────────
import { OCEANA_GALLERY } from "./hotels";

// Catalogue des services internes / externes de l'hôtel — géré depuis le module PMS
// Catalogue Oceana Hotel & Spa Hammamet — SPA reconstitué depuis le catalogue tarifé officiel
// "THE SPA-CATALOGUE.pdf" (hoteloceanasuites.tn/fr-fr/spa/) — soins Cinq Mondes, massages signature,
// soins humides, beauté, forfaits journée & séjours multi-jours. Prix réels en DT.
// Sport/loisirs/extras reconstitués depuis hoteloceanasuites.tn/services/ (pas de tarifs publiés → à confirmer).
export const SERVICES_CATALOG = [
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
export const OCEANA_SPA_INFO = {
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
export const OCEANA_RAW_SERVICE_GROUPS = {
  sportLoisirs: ["Planche à voile", "Ski nautique", "Jet-ski", "Plongée", "Équitation", "Vélo", "Visites nature", "Tennis", "Volley-ball", "Beach-volley", "Fitness", "Golf (à proximité)", "Padel (à proximité)", "Aire de jeux"],
  miniClub: ["Mini-club ouvert 7j/7 toute l'année"],
  divers: ["Wi-Fi", "Parking", "Réception 24h/24", "Salles de réunion", "Ascenseur", "Service de change", "Facilités handicapés", "Boutique", "Blanchisserie", "Secrétariat", "Coffre-fort réception"],
  extra: ["Salle de jeux", "Mini bar", "Restaurant à la carte", "Café maure", "Snack piscine", "Bar piscine", "Room service", "Bar plage"],
};

// Événements Privés — expériences suggérées pour clientèle 5★, adaptées aux infrastructures réelles de l'Oceana
// (plage privée, palmeraie, spa, salle de réunion, restaurants à thème). Tarifs estimés, non publiés par l'hôtel.
export const EVENTS_CATALOG = [
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

// ─────────────────────────────────────────────────────────────
// MODULE 4 — ORCHESTRATION HORS DES MURS (partenaires externes)
// ─────────────────────────────────────────────────────────────
export const EXTERNAL_PARTNERS = [
  { id: "ep1", name: "Dar El Jeld", type_fr: "Restaurant gastronomique — Médina de Tunis", type_en: "Fine dining — Tunis Medina", price: 180 },
  { id: "ep2", name: "El Teatro", type_fr: "Spectacle live & dîner-concert", type_en: "Live show & dinner-concert", price: 95 },
  { id: "ep3", name: "Sidi Bou Saïd — Visite privée", type_fr: "Excursion guidée avec chauffeur", type_en: "Private guided excursion with driver", price: 220 },
];

// ─────────────────────────────────────────────────────────────
// MODULE 3 — PROACTIVITÉ (météo / vol / événements contextuels)
// ─────────────────────────────────────────────────────────────
export const PROACTIVE_EVENTS = [
  { id: "pe1", icon: "weather", fr: "Averses prévues à 16h aujourd'hui. Votre séance Spa de 15h est maintenue en intérieur — voulez-vous avancer votre créneau golf à ce matin ?", en: "Rain expected at 4pm today. Your 3pm Spa session is indoor — want to move your golf slot to this morning?", ar: "أمطار متوقعة الساعة 4 مساءً. جلسة السبا في تمام 3 مساءً داخلية — هل تود تقديم موعد الغولف إلى هذا الصباح؟", cta_fr: "Avancer le golf", cta_en: "Move golf", cta_ar: "تقديم الموعد" },
  { id: "pe2", icon: "flight", fr: "Votre vol TU 0745 (départ après-demain) affiche 20 min de retard prévu. Transfert aéroport ajusté automatiquement à 05h50.", en: "Your flight TU 0745 (departing in 2 days) shows a 20 min expected delay. Airport transfer auto-adjusted to 05:50.", ar: "رحلتك TU 0745 (بعد يومين) تظهر تأخيراً متوقعاً 20 دقيقة. تم تعديل النقل إلى المطار تلقائياً إلى 05:50.", cta_fr: "Voir le transfert", cta_en: "View transfer", cta_ar: "عرض النقل" },
];

// ─────────────────────────────────────────────────────────────
// MODULE 2 — PERSONNALISATION PASSIVE (mémoire apprise du client)
// ─────────────────────────────────────────────────────────────
export const INITIAL_MEMORY = [
  { id: "mem1", fr: "Préfère un café allongé servi à 7h chaque matin", en: "Prefers a long black coffee served at 7am daily", ar: "يفضل قهوة أمريكية الساعة 7 صباحاً يومياً" },
  { id: "mem2", fr: "Allergie aux fruits de mer signalée au check-in", en: "Seafood allergy reported at check-in", ar: "حساسية من المأكولات البحرية تم تسجيلها عند تسجيل الوصول" },
  { id: "mem3", fr: "A demandé deux fois des oreillers à mémoire de forme", en: "Requested memory-foam pillows twice", ar: "طلب وسائد ذات ذاكرة الشكل مرتين" },
];
