import { NextResponse } from "next/server";
import { createClient } from "@empresa/supabase/server";
import type { Perfil } from "@empresa/supabase/types";

const PERFIS_PERMITIDOS: Perfil[] = [
  "admin",
  "recepcao",
  "profissional",
  "financeiro",
];

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

  const { data: usuarioAtual } = await supabase
    .from("usuarios")
    .select("perfil")
    .eq("id", user.id)
    .maybeSingle();

  if (usuarioAtual?.perfil !== "super_admin") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const body = await request.json();
  const nome = String(body.nome ?? "").trim();
  const perfil = body.perfil as Perfil;
  const ativo = Boolean(body.ativo);

  if (!nome || !PERFIS_PERMITIDOS.includes(perfil)) {
    return NextResponse.json(
      { error: "Preencha nome e um perfil válido." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("usuarios")
    .update({ nome, perfil, ativo })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível atualizar o usuário." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
