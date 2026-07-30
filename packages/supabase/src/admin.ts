import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client com a service role key: bypassa RLS. Só pode ser importado em
 * código server-only (server actions/route handlers), nunca em Client
 * Components — usado exclusivamente para provisionamento de usuários
 * (super_admin cria clínicas/admins; admin de clínica cria usuários).
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
