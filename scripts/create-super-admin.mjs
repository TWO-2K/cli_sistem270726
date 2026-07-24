// Cria o primeiro super_admin do sistema (dono do SaaS). Só precisa ser
// rodado uma vez por ambiente — depois disso, o próprio super_admin cria
// clínicas e admins pelo painel /admin.
//
// Uso:
//   node --env-file=.env.local scripts/create-super-admin.mjs <email> <senha> "<Nome>"
import { createClient } from "@supabase/supabase-js";

const [, , email, senha, nome] = process.argv;

if (!email || !senha || !nome) {
  console.error(
    'Uso: node --env-file=.env.local scripts/create-super-admin.mjs <email> <senha> "<Nome>"',
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local antes de rodar.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: authUser, error: authError } = await admin.auth.admin.createUser({
  email,
  password: senha,
  email_confirm: true,
  user_metadata: { nome },
});

if (authError || !authUser.user) {
  console.error("Erro ao criar usuário:", authError?.message);
  process.exit(1);
}

const { error: usuarioError } = await admin.from("usuarios").insert({
  id: authUser.user.id,
  clinica_id: null,
  nome,
  email,
  perfil: "super_admin",
  must_change_password: false,
});

if (usuarioError) {
  console.error("Erro ao vincular super_admin:", usuarioError.message);
  await admin.auth.admin.deleteUser(authUser.user.id);
  process.exit(1);
}

console.log(`super_admin criado: ${email}`);
console.log("Acesse /login com essas credenciais.");
