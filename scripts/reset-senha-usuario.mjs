// Redefine a senha de um usuário existente (Supabase Auth) via service role
// key — bypassa a senha atual. Usar quando o usuário perdeu acesso e não
// consegue passar pelo fluxo normal de "esqueci minha senha".
//
// Marca must_change_password = true, então o usuário é obrigado a trocar a
// senha temporária no próximo login (/mudar-senha).
//
// Uso:
//   node --env-file=apps/web-estetica/.env.local scripts/reset-senha-usuario.mjs <email> <nova-senha>
//
// Para resetar um usuário do app admin, aponte para o .env.local dele:
//   node --env-file=apps/admin/.env.local scripts/reset-senha-usuario.mjs <email> <nova-senha>
import { createClient } from "@supabase/supabase-js";

const [, , email, novaSenha] = process.argv;

if (!email || !novaSenha) {
  console.error(
    "Uso: node --env-file=<caminho-do-.env.local> scripts/reset-senha-usuario.mjs <email> <nova-senha>",
  );
  process.exit(1);
}

if (novaSenha.length < 6) {
  console.error("A nova senha precisa ter pelo menos 6 caracteres.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (via --env-file) antes de rodar.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: usuario, error: buscaError } = await admin
  .from("usuarios")
  .select("id, nome, email")
  .eq("email", email)
  .maybeSingle();

if (buscaError) {
  console.error("Erro ao buscar usuário:", buscaError.message);
  process.exit(1);
}

if (!usuario) {
  console.error(`Nenhum usuário encontrado com o e-mail ${email}.`);
  process.exit(1);
}

const { error: authError } = await admin.auth.admin.updateUserById(usuario.id, {
  password: novaSenha,
});

if (authError) {
  console.error("Erro ao redefinir senha:", authError.message);
  process.exit(1);
}

const { error: usuarioError } = await admin
  .from("usuarios")
  .update({ must_change_password: true })
  .eq("id", usuario.id);

if (usuarioError) {
  console.error("Senha redefinida, mas falhou ao marcar troca obrigatória:", usuarioError.message);
  process.exit(1);
}

console.log(`Senha redefinida para ${usuario.nome} <${usuario.email}>.`);
console.log("O usuário será obrigado a trocar a senha no próximo login.");
