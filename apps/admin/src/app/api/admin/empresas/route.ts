import { NextResponse } from "next/server";
import { createClient } from "@empresa/supabase/server";
import { createAdminClient } from "@empresa/supabase/admin";
import { gerarSenhaTemporaria } from "@empresa/supabase/senha-temporaria";
import { SEGMENTOS, type Segmento } from "@empresa/supabase/types";
import { logger } from "@empresa/observability/logger";

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
  const nomeEmpresa = String(body.nomeEmpresa ?? "").trim();
  const segmento = String(body.segmento ?? "").trim();
  const nomeAdmin = String(body.nomeAdmin ?? "").trim();
  const emailAdmin = String(body.emailAdmin ?? "")
    .trim()
    .toLowerCase();

  if (!nomeEmpresa || !nomeAdmin || !emailAdmin) {
    return NextResponse.json(
      { error: "Preencha nome da empresa, nome e e-mail do admin." },
      { status: 400 },
    );
  }

  if (!SEGMENTOS.includes(segmento as Segmento)) {
    return NextResponse.json(
      { error: "Segmento inválido." },
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
    logger.error("falha ao provisionar empresa (auth do admin)", {
      error: authError?.message,
      nomeEmpresa,
    });
    return NextResponse.json(
      { error: authError?.message ?? "Não foi possível criar o usuário." },
      { status: 400 },
    );
  }

  const { data: empresa, error: empresaError } = await admin
    .from("empresas")
    .insert({ nome: nomeEmpresa, segmento: segmento as Segmento })
    .select("id")
    .single();

  if (empresaError || !empresa) {
    logger.error("falha ao provisionar empresa (insert empresa)", {
      error: empresaError?.message,
      nomeEmpresa,
    });
    await admin.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json(
      { error: "Não foi possível criar a empresa." },
      { status: 400 },
    );
  }

  const { error: usuarioError } = await admin.from("usuarios").insert({
    id: authUser.user.id,
    empresa_id: empresa.id,
    nome: nomeAdmin,
    email: emailAdmin,
    perfil: "admin",
    must_change_password: true,
  });

  if (usuarioError) {
    logger.error("falha ao provisionar empresa (vincular admin)", {
      error: usuarioError.message,
      empresaId: empresa.id,
    });
    await admin.auth.admin.deleteUser(authUser.user.id);
    await admin.from("empresas").delete().eq("id", empresa.id);
    return NextResponse.json(
      { error: "Não foi possível vincular o admin à empresa." },
      { status: 400 },
    );
  }

  return NextResponse.json({ senhaTemporaria });
}
