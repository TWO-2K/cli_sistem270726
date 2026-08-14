// Fase 2b: lembrete automático de agendamento por e-mail.
// Chamada pelo pg_cron a cada 15min (ver migration 0036). Varre agendamentos
// nas próximas ~24h que ainda não receberam lembrete, manda e-mail via Resend
// e marca `lembrete_enviado_em` para não duplicar no próximo disparo do cron.
// SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY são injetadas automaticamente pelo
// runtime de Edge Functions — só RESEND_API_KEY precisa ser configurada via
// `supabase secrets set`.
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const REMETENTE = "Clínica+ <onboarding@resend.dev>";

type AgendamentoLembrete = {
  id: string;
  data_hora: string;
  pacientes: { nome: string; email: string | null } | null;
  procedimentos: { nome: string } | null;
  empresas: { nome: string } | null;
};

function formatarDataHora(dataHoraIso: string) {
  return new Date(dataHoraIso).toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const agora = new Date();
  const janelaInicio = new Date(agora.getTime() + 23.5 * 60 * 60 * 1000);
  const janelaFim = new Date(agora.getTime() + 24.5 * 60 * 60 * 1000);

  const { data: agendamentos, error } = await supabase
    .from("agendamentos")
    .select(
      "id, data_hora, pacientes(nome, email), procedimentos(nome), empresas(nome)",
    )
    .in("status", ["agendado", "confirmado"])
    .is("lembrete_enviado_em", null)
    .gte("data_hora", janelaInicio.toISOString())
    .lte("data_hora", janelaFim.toISOString())
    .returns<AgendamentoLembrete[]>();

  if (error) {
    return new Response(JSON.stringify({ erro: error.message }), { status: 500 });
  }

  let enviados = 0;
  let semEmail = 0;
  const falhas: { id: string; erro: string }[] = [];

  for (const agendamento of agendamentos ?? []) {
    const email = agendamento.pacientes?.email;
    if (!email) {
      semEmail++;
      continue;
    }

    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: REMETENTE,
        to: email,
        subject: `Lembrete: seu horário amanhã em ${agendamento.empresas?.nome ?? "nossa clínica"}`,
        html: `
          <p>Olá, ${agendamento.pacientes?.nome ?? ""}!</p>
          <p>Passando para lembrar do seu horário${
            agendamento.procedimentos?.nome
              ? ` de <strong>${agendamento.procedimentos.nome}</strong>`
              : ""
          } em <strong>${formatarDataHora(agendamento.data_hora)}</strong>.</p>
          <p>Até lá!</p>
        `,
      }),
    });

    if (!resposta.ok) {
      falhas.push({ id: agendamento.id, erro: await resposta.text() });
      continue;
    }

    await supabase
      .from("agendamentos")
      .update({ lembrete_enviado_em: new Date().toISOString() })
      .eq("id", agendamento.id);
    enviados++;
  }

  return new Response(
    JSON.stringify({ enviados, semEmail, falhas, total: agendamentos?.length ?? 0 }),
    { headers: { "Content-Type": "application/json" } },
  );
});
