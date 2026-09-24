import { createClient } from "@supabase/supabase-js";
import { config } from "../config";

// Client "anon" — utilisé uniquement pour vérifier email/mot de passe
export const supabaseAuth = createClient(config.supabase.url, config.supabase.anonKey);

// Client "admin" (service role) — création/màj d'utilisateurs.
// ⚠️ Ne jamais exposer ce client ou sa clé côté frontend.
export const supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
