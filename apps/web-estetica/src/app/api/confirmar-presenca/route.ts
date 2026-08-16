import { NextResponse } from "next/server";
import { createAdminClient } from "@empresa/supabase/admin";
import { logger } from "@empresa/observability/logger";

// Rota pública (sem requireUsuarioEmpresa) — o paciente clica no link do
// e-mail de lembrete sem estar logado. O token identifica o agendamento sem
// expor autenticação de empresa, então usa o client de service role, mesmo
// padrão das rotas de provisionamento (api/usuarios/route.ts).
export async function POST(request: Request) {
  const body = await request.json();
  const token = String(body.token ?? "");

  if (!token) {
    return NextResponse.json({ error: "Token ausente." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: agendamento, error: erroBusca } = await admin
    .from("agendamentos")
    .select("id, status, data_hora")
    .eq("token_confirmacao", token)
    .maybeSingle();

  if (erroBusca || !agendamento) {
    return NextResponse.json(
      { error: "Link inválido ou expirado." },
      { status: 404 },
    );
  }

  if (agendamento.status !== "agendado") {
    return NextResponse.json(
      {
        error:
          agendamento.status === "confirmado"
            ? "Presença já confirmada."
            : "Este agendamento não está mais disponível para confirmação.",
      },
      { status: 409 },
    );
  }

  if (new Date(agendamento.data_hora).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Este agendamento já passou." },
      { status: 409 },
    );
  }

  const { error: erroUpdate } = await admin
    .from("agendamentos")
    .update({ status: "confirmado" })
    .eq("id", agendamento.id);

  if (erroUpdate) {
    logger.error("falha ao confirmar presenca via link publico", {
      error: erroUpdate.message,
      agendamentoId: agendamento.id,
    });
    return NextResponse.json(
      { error: "Não foi possível confirmar. Tente novamente." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
