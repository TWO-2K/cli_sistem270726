import { NextResponse } from "next/server";
import { createClient } from "@clinica/supabase/server";
import { createAdminClient } from "@clinica/supabase/admin";
import type { Perfil } from "@/lib/types/db";

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
    .select("perfil, clinica_id")
    .eq("id", user.id)
    .maybeSingle();

  if (usuarioAtual?.perfil !== "admin" || !usuarioAtual.clinica_id) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const body = await request.json();
  const nome = String(body.nome ?? "").trim();
  const perfil = body.perfil as Perfil;
  const especialidade = body.especialidade
    ? String(body.especialidade).trim() || null
    : null;
  const atende = Boolean(body.atende);
  const ativo = Boolean(body.ativo);

  if (!nome || !PERFIS_PERMITIDOS.includes(perfil)) {
    return NextResponse.json(
      { error: "Preencha nome e um perfil válido." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("usuarios")
    .update({ nome, perfil, especialidade, atende, ativo })
    .eq("id", id)
    .eq("clinica_id", usuarioAtual.clinica_id);

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível atualizar o usuário." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
