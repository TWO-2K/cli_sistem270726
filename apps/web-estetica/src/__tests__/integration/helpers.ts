import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@empresa/supabase/admin";

/**
 * Testes de integração rodam contra o Supabase remoto (não há Supabase local
 * neste projeto — ver AGENTS.md/CLAUDE.md), autenticando como o usuário admin
 * já provisionado na "empresa de teste" (`empresas.is_teste`, migrations
 * 0019/0021). Precisa ser um login real (não o client de service role):
 * `set_empresa_id()` deriva `empresa_id` de `auth.uid()` via `auth_empresa_id()`,
 * então um insert sem sessão autenticada grava `empresa_id = null` e viola a
 * constraint not-null.
 *
 * O client de service role (`adminClient`) só serve para leitura/limpeza que
 * bypassa RLS (ex. apagar fixtures no fim do teste).
 */
export function adminClient() {
  return createAdminClient();
}

let empresaIdCache: string | null = null;

export async function empresaDeTesteId() {
  if (empresaIdCache) return empresaIdCache;

  const { data, error } = await adminClient()
    .from("empresas")
    .select("id")
    .eq("is_teste", true)
    .single();

  if (error || !data) {
    throw new Error(
      "Nenhuma empresa marcada como is_teste=true encontrada no banco remoto. " +
        "Testes de integração precisam dela (ver migrations 0019/0021).",
    );
  }

  empresaIdCache = data.id as string;
  return empresaIdCache;
}

export async function usuarioDeTesteClient() {
  const email = process.env.TEST_USUARIO_EMAIL;
  const senha = process.env.TEST_USUARIO_SENHA;

  if (!email || !senha) {
    throw new Error(
      "TEST_USUARIO_EMAIL/TEST_USUARIO_SENHA ausentes em apps/web-estetica/.env.local — " +
        "necessários para autenticar como usuário real da empresa de teste.",
    );
  }

  const client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );

  const { error } = await client.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    throw new Error(`Falha ao autenticar usuário de teste: ${error.message}`);
  }

  return client;
}
