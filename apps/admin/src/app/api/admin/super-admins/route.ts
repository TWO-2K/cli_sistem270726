import { NextResponse } from "next/server";
import { createClient } from "@empresa/supabase/server";
import { createAdminClient } from "@empresa/supabase/admin";
import { gerarSenhaTemporaria } from "@empresa/supabase/senha-temporaria";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("perfil")
    .eq("id", user.id)
    .maybeSingle();

  if (usuario?.perfil !== "super_admin") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const body = await request.json();
  const nome = String(body.nome ?? "").trim();
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();

  if (!nome || !email) {
    return NextResponse.json(
      { error: "Preencha nome e e-mail." },
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
    empresa_id: null,
    nome,
    email,
    perfil: "super_admin",
    must_change_password: true,
  });

  if (usuarioError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json(
      { error: "Não foi possível criar o super admin." },
      { status: 400 },
    );
  }

  return NextResponse.json({ senhaTemporaria });
}
