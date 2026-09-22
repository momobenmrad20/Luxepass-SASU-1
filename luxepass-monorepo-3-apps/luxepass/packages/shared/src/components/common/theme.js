// ─────────────────────────────────────────────────────────────
// theme.js — couleurs de marque et petits helpers visuels partagés.
//
// Extrait tel quel de LuxePass.jsx (aucune valeur, aucune logique
// modifiée) — c'était déclaré "en premier [dans le fichier d'origine]
// car utilisé par des constantes de données évaluées au chargement du
// module (ex: CHANNELS)". Ici, c'est juste le premier fichier importé
// par tout le reste de src/components/**, pour la même raison.
// ─────────────────────────────────────────────────────────────

export const gold = "#D4AF37";
export const goldDark = "#B8961E";

export const hexToRgba = (hex, alpha = 1) => {
  const h = (hex || gold).replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Les photos sont hotlinkées depuis hoteloceanasuites.tn. Si le site bloque le
// hotlinking (Referer) ou si le réseau les bloque, on masque l'image plutôt que
// de laisser le navigateur afficher l'icône "image cassée" + le texte alt par-dessus.
export const handleImgError = (e) => { e.currentTarget.style.display = "none"; };
