import { NextResponse } from "next/server";
import { createClient } from "@empresa/supabase/server";
import { createAdminClient } from "@empresa/supabase/admin";
import { logger } from "@empresa/observability/logger";
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
    .select("perfil, empresa_id")
    .eq("id", user.id)
    .maybeSingle();

  if (usuarioAtual?.perfil !== "admin" || !usuarioAtual.empresa_id) {
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
  const unidadeId = body.unidade_id ? String(body.unidade_id) : null;

  if (!nome || !PERFIS_PERMITIDOS.includes(perfil)) {
    return NextResponse.json(
      { error: "Preencha nome e um perfil válido." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("usuarios")
    .update({ nome, perfil, especialidade, atende, ativo, unidade_id: unidadeId })
    .eq("id", id)
    .eq("empresa_id", usuarioAtual.empresa_id);

  if (error) {
    logger.error("falha ao atualizar usuario", {
      error: error.message,
      usuarioId: id,
      empresaId: usuarioAtual.empresa_id,
    });
    return NextResponse.json(
      { error: "Não foi possível atualizar o usuário." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
