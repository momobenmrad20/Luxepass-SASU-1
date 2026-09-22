// @ts-check
import { createContext, useMemo, useState } from "react";
import { i18n } from "../i18n";

// ─────────────────────────────────────────────────────────────
// I18nContext — langue courante + dictionnaire correspondant.
// Remplace le passage de `t` et `lang` en props dans tous les composants :
// `const { t, lang } = useI18n();` (hooks/useI18n.js).
// ─────────────────────────────────────────────────────────────
export const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState("fr");

  const value = useMemo(() => {
    const t = i18n[lang];
    return { lang, setLang, t, isRTL: t.dir === "rtl" };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
