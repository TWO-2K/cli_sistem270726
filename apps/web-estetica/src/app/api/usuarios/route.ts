import { NextResponse } from "next/server";
import { createClient } from "@empresa/supabase/server";
import { createAdminClient } from "@empresa/supabase/admin";
import { gerarSenhaTemporaria } from "@empresa/supabase/senha-temporaria";
import type { Perfil } from "@/lib/types/db";

const PERFIS_PERMITIDOS: Perfil[] = [
  "admin",
  "recepcao",
  "profissional",
  "financeiro",
];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: usuarioAtual } = await supabase
    .from("usuarios")
    .select("perfil, empresa_id")
    .eq("id", user.id)
    .maybeSingle();

  if (usuarioAtual?.perfil !== "admin" || !usuarioAtual.empresa_id) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const body = await request.json();
  const nome = String(body.nome ?? "").trim();
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  const perfil = body.perfil as Perfil;
  const especialidade = body.especialidade
    ? String(body.especialidade).trim() || null
    : null;
  const atende = Boolean(body.atende);

  if (!nome || !email || !PERFIS_PERMITIDOS.includes(perfil)) {
    return NextResponse.json(
      { error: "Preencha nome, e-mail e um perfil válido." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const senhaTemporaria = gerarSenhaTemporaria();

  const { data: authUser, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password: senhaTemporaria,
      email_confirm: true,
      user_metadata: { nome },
    });

  if (authError || !authUser.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Não foi possível criar o usuário." },
      { status: 400 },
    );
  }

  const { error: usuarioError } = await admin.from("usuarios").insert({
    id: authUser.user.id,
    empresa_id: usuarioAtual.empresa_id,
    nome,
    email,
    perfil,
    must_change_password: true,
    especialidade,
    atende,
  });

  if (usuarioError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json(
      { error: "Não foi possível cadastrar o usuário." },
      { status: 400 },
    );
  }

  return NextResponse.json({ senhaTemporaria });
}
