// @ts-check
import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

/**
 * Session staff (staffAuth, staffHotelId, loginStaff, logoutStaff…) et
 * drapeau de restauration du séjour client (clientRestoring, clearClientStay).
 */
/** @returns {import("../types").AuthContextValue} */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé à l'intérieur de <AuthProvider>");
  return ctx;
}
