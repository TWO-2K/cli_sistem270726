// Fase 2d: notifica o próximo da fila de espera quando um horário é
// liberado por cancelamento. Chamada pelo trigger de banco
// `notificar_fila_espera_cancelamento_trigger` (migration 0038) via pg_net,
// com { agendamento_id } no body — não por cron, o gatilho é o evento de
// cancelamento em si.
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:1010";
const REMETENTE = "Clínica+ <onboarding@resend.dev>";

type Agendamento = {
  id: string;
  empresa_id: string;
  usuario_id: string;
  procedimento_id: string | null;
  data_hora: string;
  status: string;
};

type ListaEsperaMatch = {
  id: string;
  profissional_id: string | null;
  procedimento_id: string | null;
  periodo_dia: string;
  oferta_expira_em: string | null;
  criado_em: string;
  pacientes: { nome: string; email: string | null } | null;
};

function calcularPeriodoDia(dataHoraIso: string) {
  const hora = new Date(dataHoraIso).toLocaleString("en-US", {
    hour: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  });
  const h = Number(hora);
  if (h < 12) return "manha";
  if (h < 18) return "tarde";
  return "noite";
}

function formatarDataHora(dataHoraIso: string) {
  return new Date(dataHoraIso).toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { agendamento_id } = await req.json();

  const { data: agendamento } = await supabase
    .from("agendamentos")
    .select("id, empresa_id, usuario_id, procedimento_id, data_hora, status")
    .eq("id", agendamento_id)
    .maybeSingle<Agendamento>();

  if (!agendamento || agendamento.status !== "cancelado") {
    return new Response(JSON.stringify({ notificado: false, motivo: "agendamento_invalido" }));
  }

  if (new Date(agendamento.data_hora).getTime() < Date.now()) {
    return new Response(JSON.stringify({ notificado: false, motivo: "horario_no_passado" }));
  }

  const periodoDia = calcularPeriodoDia(agendamento.data_hora);
  const dataSlot = agendamento.data_hora.slice(0, 10);
  const agora = Date.now();

  // Filtros certos (empresa/status/janela de data) vão pro Postgres; os
  // campos "null = qualquer" (profissional/procedimento/período) são
  // avaliados em JS — encadear múltiplos .or() no client tem comportamento
  // incerto quanto a combinar via AND entre si.
  const { data: candidatos } = await supabase
    .from("lista_espera")
    .select(
      "id, profissional_id, procedimento_id, periodo_dia, oferta_expira_em, criado_em, pacientes(nome, email)",
    )
    .eq("empresa_id", agendamento.empresa_id)
    .eq("status", "aguardando")
    .lte("disponibilidade_inicio", dataSlot)
    .gte("disponibilidade_fim", dataSlot)
    .order("criado_em", { ascending: true })
    .returns<ListaEsperaMatch[]>();

  const match = (candidatos ?? []).find(
    (c) =>
      (c.profissional_id === null || c.profissional_id === agendamento.usuario_id) &&
      (c.procedimento_id === null || c.procedimento_id === agendamento.procedimento_id) &&
      (c.periodo_dia === "qualquer" || c.periodo_dia === periodoDia) &&
      (c.oferta_expira_em === null || new Date(c.oferta_expira_em).getTime() < agora) &&
      !!c.pacientes?.email,
  );

  if (!match || !match.pacientes?.email) {
    return new Response(JSON.stringify({ notificado: false, motivo: "sem_match" }));
  }

  const token = crypto.randomUUID();
  const expiraEm = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  await supabase
    .from("lista_espera")
    .update({
      oferta_agendamento_id: agendamento.id,
      oferta_token: token,
      oferta_expira_em: expiraEm,
    })
    .eq("id", match.id);

  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: REMETENTE,
      to: match.pacientes.email,
      subject: "Um horário abriu na sua fila de espera!",
      html: `
        <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background-color:#f1f5f9;padding:32px 16px;">
          <table role="presentation" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr><td style="padding:24px;">
              <p style="margin:0 0 4px;color:#0f172a;font-size:18px;font-weight:700;">
                Olá, ${match.pacientes.nome.split(" ")[0]}!
              </p>
              <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.5;">
                Um horário que combina com o que você pediu na fila de espera acabou de abrir:
                <strong>${formatarDataHora(agendamento.data_hora)}</strong>.
              </p>
              <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.5;">
                Esta oferta é válida por 2 horas — depois disso, passa pro próximo da fila.
              </p>
              <a href="${SITE_URL}/reservar-horario/${token}"
                 style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;
                        font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;">
                Reservar este horário
              </a>
            </td></tr>
          </table>
        </div>
      `,
    }),
  });

  return new Response(
    JSON.stringify({ notificado: resposta.ok, listaEsperaId: match.id }),
    { headers: { "Content-Type": "application/json" } },
  );
});
