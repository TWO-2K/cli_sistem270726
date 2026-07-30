import { NextResponse } from "next/server";
import { createClient } from "@empresa/supabase/server";
import { EMPRESA_STATUS, type EmpresaStatus } from "@empresa/supabase/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
  const status = body.status as EmpresaStatus;
  const cnpj = body.cnpj ? String(body.cnpj).trim() || null : null;
  const endereco = body.endereco ? String(body.endereco).trim() || null : null;
  const email = body.email ? String(body.email).trim().toLowerCase() || null : null;

  if (!nome || !EMPRESA_STATUS.includes(status)) {
    return NextResponse.json(
      { error: "Preencha nome e um status válido." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("empresas")
    .update({ nome, status, cnpj, endereco, email })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível atualizar a empresa." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
