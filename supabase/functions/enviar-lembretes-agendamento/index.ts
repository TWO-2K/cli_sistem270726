// Fase 2b: lembrete automático de agendamento por e-mail.
// Chamada pelo pg_cron a cada 15min (ver migration 0036). Varre agendamentos
// nas próximas ~24h que ainda não receberam lembrete, manda e-mail via Resend
// e marca `lembrete_enviado_em` para não duplicar no próximo disparo do cron.
// SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY são injetadas automaticamente pelo
// runtime de Edge Functions — só RESEND_API_KEY precisa ser configurada via
// `supabase secrets set`.
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:1010";
const REMETENTE = "Clínica+ <onboarding@resend.dev>";

type AgendamentoLembrete = {
  id: string;
  data_hora: string;
  duracao_minutos: number;
  status: string;
  token_confirmacao: string;
  pacientes: { nome: string; email: string | null } | null;
  procedimentos: { nome: string; duracao_minutos: number | null } | null;
  usuarios: { nome: string } | null;
  salas: { nome: string } | null;
  empresas: { nome: string } | null;
};

function formatarData(dataHoraIso: string) {
  return new Date(dataHoraIso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "America/Sao_Paulo",
  });
}

function formatarHora(dataHoraIso: string) {
  return new Date(dataHoraIso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function montarHtml(agendamento: AgendamentoLembrete) {
  const nomeEmpresa = agendamento.empresas?.nome ?? "sua clínica";
  const primeiroNome = (agendamento.pacientes?.nome ?? "").split(" ")[0];

  const linhas = [
    { rotulo: "Data", valor: formatarData(agendamento.data_hora) },
    { rotulo: "Horário", valor: formatarHora(agendamento.data_hora) },
    agendamento.procedimentos?.nome
      ? { rotulo: "Procedimento", valor: agendamento.procedimentos.nome }
      : null,
    agendamento.usuarios?.nome
      ? { rotulo: "Profissional", valor: agendamento.usuarios.nome }
      : null,
    agendamento.salas?.nome
      ? { rotulo: "Sala", valor: agendamento.salas.nome }
      : null,
    { rotulo: "Duração prevista", valor: `${agendamento.duracao_minutos} minutos` },
  ].filter((l): l is { rotulo: string; valor: string } => l !== null);

  const linhasHtml = linhas
    .map(
      (l) => `
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:14px;width:140px;">${l.rotulo}</td>
          <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${l.valor}</td>
        </tr>`,
    )
    .join("");

  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background-color:#f1f5f9;padding:32px 16px;">
      <table role="presentation" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr>
          <td style="background:#0f172a;padding:20px 24px;">
            <p style="margin:0;color:#ffffff;font-size:16px;font-weight:600;">${nomeEmpresa}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 4px;color:#0f172a;font-size:18px;font-weight:700;">
              Olá, ${primeiroNome || "tudo bem"}!
            </p>
            <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.5;">
              Passando para lembrar do seu horário amanhã.
            </p>
            <table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;padding-top:8px;">
              ${linhasHtml}
            </table>
            ${
              agendamento.status === "agendado"
                ? `
            <table role="presentation" style="width:100%;margin-top:20px;">
              <tr>
                <td>
                  <a href="${SITE_URL}/confirmar-presenca/${agendamento.token_confirmacao}"
                     style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;
                            font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;">
                    Confirmar presença
                  </a>
                </td>
              </tr>
            </table>`
                : ""
            }
            <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.5;">
              Se precisar remarcar ou cancelar, entre em contato com ${nomeEmpresa}.
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
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
      "id, data_hora, duracao_minutos, status, token_confirmacao, pacientes(nome, email), " +
        "procedimentos(nome, duracao_minutos), usuarios(nome), salas(nome), empresas(nome)",
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
        html: montarHtml(agendamento),
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
