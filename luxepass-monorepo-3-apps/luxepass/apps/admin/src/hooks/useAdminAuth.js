// @ts-check
import { useContext } from "react";
import { AdminAuthContext } from "../contexts/AdminAuthContext";

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth doit être utilisé à l'intérieur de <AdminAuthProvider>");
  return ctx;
}
