// @ts-check
import { useContext } from "react";
import { AppStateContext } from "../contexts/AppStateContext";

/**
 * Navigation/UI globale (role, screen, selectedHotel, partnerHotels,
 * storageAvailable…) et état PMS de l'hôtel courant (appState, setAppState).
 */
/** @returns {import("../types").AppStateContextValue} */
export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState doit être utilisé à l'intérieur de <AppStateProvider>");
  return ctx;
}
