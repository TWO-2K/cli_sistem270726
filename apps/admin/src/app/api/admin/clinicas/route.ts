import { NextResponse } from "next/server";
import { createClient } from "@clinica/supabase/server";
import { createAdminClient } from "@clinica/supabase/admin";
import { gerarSenhaTemporaria } from "@clinica/supabase/senha-temporaria";

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
  const nomeClinica = String(body.nomeClinica ?? "").trim();
  const segmento = String(body.segmento ?? "").trim();
  const nomeAdmin = String(body.nomeAdmin ?? "").trim();
  const emailAdmin = String(body.emailAdmin ?? "")
    .trim()
    .toLowerCase();

  if (!nomeClinica || !nomeAdmin || !emailAdmin) {
    return NextResponse.json(
      { error: "Preencha nome da clínica, nome e e-mail do admin." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const senhaTemporaria = gerarSenhaTemporaria();

  const { data: authUser, error: authError } =
    await admin.auth.admin.createUser({
      email: emailAdmin,
      password: senhaTemporaria,
      email_confirm: true,
      user_metadata: { nome: nomeAdmin },
    });

  if (authError || !authUser.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Não foi possível criar o usuário." },
      { status: 400 },
    );
  }

  const { data: clinica, error: clinicaError } = await admin
    .from("clinicas")
    .insert({ nome: nomeClinica, segmento: segmento || null })
    .select("id")
    .single();

  if (clinicaError || !clinica) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json(
      { error: "Não foi possível criar a clínica." },
      { status: 400 },
    );
  }

  const { error: usuarioError } = await admin.from("usuarios").insert({
    id: authUser.user.id,
    clinica_id: clinica.id,
    nome: nomeAdmin,
    email: emailAdmin,
    perfil: "admin",
    must_change_password: true,
  });

  if (usuarioError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    await admin.from("clinicas").delete().eq("id", clinica.id);
    return NextResponse.json(
      { error: "Não foi possível vincular o admin à clínica." },
      { status: 400 },
    );
  }

  return NextResponse.json({ senhaTemporaria });
}
