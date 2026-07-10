import { createClient } from "@supabase/supabase-js";

// Client Supabase ADMIN — SERVEUR UNIQUEMENT (clé secrète service_role).
// Ne jamais importer depuis un composant client.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
