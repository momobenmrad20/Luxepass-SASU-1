// @ts-check
import { useContext } from "react";
import { I18nContext } from "../contexts/I18nContext";

/** @returns {import("../types").I18nContextValue} */
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n doit être utilisé à l'intérieur de <I18nProvider>");
  return ctx;
}
