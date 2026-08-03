import Link from "next/link";
import { createClient } from "@empresa/supabase/server";
import { requireUsuarioEmpresa } from "@/lib/current-empresa";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@empresa/ui/components/card";
import { Badge } from "@empresa/ui/components/badge";
import type { Agendamento } from "@/lib/types/db";

type AgendamentoComNomes = Agendamento & {
  pacientes: { nome: string } | null;
  procedimentos: { nome: string } | null;
};

const STATUS_AGENDAMENTO_LABEL: Record<Agendamento["status"], string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
  faltou: "Faltou",
};

const STATUS_AGENDAMENTO_VARIANT: Record<
  Agendamento["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  agendado: "secondary",
  confirmado: "default",
  em_atendimento: "default",
  concluido: "outline",
  cancelado: "destructive",
  faltou: "destructive",
};

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DashboardPage() {
  const { usuario, empresa } = await requireUsuarioEmpresa();
  const supabase = await createClient();

  const veAgendaHoje =
    usuario.perfil === "recepcao" ||
    usuario.perfil === "profissional" ||
    usuario.perfil === "admin";
  const veAtendimentoAberto =
    usuario.perfil === "profissional" || usuario.perfil === "admin";
  const veComissaoPropria = usuario.perfil === "profissional";
  const veFinanceiro =
    usuario.perfil === "admin" || usuario.perfil === "financeiro";
  const veComercial =
    usuario.perfil === "admin" || usuario.perfil === "financeiro";
  const veRelatoriosResumo = usuario.perfil === "admin";

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const comandaAntigaCorte = new Date();
  comandaAntigaCorte.setDate(comandaAntigaCorte.getDate() - 2);

  const leadParadoCorte = new Date();
  leadParadoCorte.setDate(leadParadoCorte.getDate() - 3);

  const start30d = new Date();
  start30d.setDate(start30d.getDate() - 30);

  const em7dias = new Date();
  em7dias.setDate(em7dias.getDate() + 7);

  const [
    { data: agendamentosHoje },
    { count: atendimentoAbertoCount },
    { data: comissoesPendentes },
    { data: parcelasPendentes },
    { data: despesasPendentes },
    { count: comandasAntigasCount },
    { data: pagamentosMes },
    { count: leadsParadosCount },
    { count: cancelamentosCount },
    { data: comissoesMes },
    { data: despesasPagasMes },
    { data: comissoesPendentesTotal },
  ] = await Promise.all([
    veAgendaHoje
      ? (() => {
          let query = supabase
            .from("agendamentos")
            .select("*, pacientes(nome), procedimentos(nome)")
            .gte("data_hora", startOfDay.toISOString())
            .lte("data_hora", endOfDay.toISOString())
            .order("data_hora", { ascending: true });
          if (usuario.perfil === "profissional") {
            query = query.eq("usuario_id", usuario.id);
          }
          return query.returns<AgendamentoComNomes[]>();
        })()
      : Promise.resolve({ data: null }),
    veAtendimentoAberto
      ? supabase
          .from("atendimentos")
          .select("id", { count: "exact", head: true })
          .eq("usuario_id", usuario.id)
          .eq("status", "em_andamento")
      : Promise.resolve({ count: null }),
    veComissaoPropria
      ? supabase
          .from("comissoes_lancadas")
          .select("valor_comissao")
          .eq("usuario_id", usuario.id)
          .eq("status", "pendente")
          .is("repasse_id", null)
      : Promise.resolve({ data: null }),
    veFinanceiro
      ? supabase.from("parcelas").select("valor, vencimento").eq("status", "pendente")
      : Promise.resolve({ data: null }),
    veFinanceiro
      ? supabase.from("despesas").select("valor, vencimento").eq("status", "pendente")
      : Promise.resolve({ data: null }),
    veFinanceiro
      ? supabase
          .from("comandas")
          .select("id", { count: "exact", head: true })
          .eq("status", "aberta")
          .lt("criado_em", comandaAntigaCorte.toISOString())
      : Promise.resolve({ count: null }),
    veFinanceiro
      ? supabase
          .from("pagamentos")
          .select("valor")
          .eq("status", "pago")
          .gte("criado_em", startOfMonth.toISOString())
      : Promise.resolve({ data: null }),
    veComercial
      ? supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .in("estagio", ["novo", "contatado"])
          .lt("atualizado_em", leadParadoCorte.toISOString())
      : Promise.resolve({ count: null }),
    veRelatoriosResumo
      ? supabase
          .from("agendamentos")
          .select("id", { count: "exact", head: true })
          .in("status", ["cancelado", "faltou"])
          .gte("data_hora", start30d.toISOString())
      : Promise.resolve({ count: null }),
    veFinanceiro
      ? supabase
          .from("comissoes_lancadas")
          .select("valor_comissao")
          .gte("criado_em", startOfMonth.toISOString())
      : Promise.resolve({ data: null }),
    veFinanceiro
      ? supabase
          .from("despesas")
          .select("valor")
          .not("pago_em", "is", null)
          .gte("pago_em", startOfMonth.toISOString())
      : Promise.resolve({ data: null }),
    veFinanceiro
      ? supabase
          .from("comissoes_lancadas")
          .select("valor_comissao")
          .eq("status", "pendente")
          .is("repasse_id", null)
      : Promise.resolve({ data: null }),
  ]);

  const hoje = new Date().toISOString().slice(0, 10);

  const comissaoPendenteTotal = (comissoesPendentes ?? []).reduce(
    (sum, c) => sum + Number(c.valor_comissao),
    0,
  );

  const parcelasAtrasadas = (parcelasPendentes ?? []).filter(
    (p) => p.vencimento < hoje,
  );
  const totalParcelasAtrasadas = parcelasAtrasadas.reduce(
    (sum, p) => sum + Number(p.valor),
    0,
  );

  const em7diasStr = em7dias.toISOString().slice(0, 10);
  const parcelasAVencer = (parcelasPendentes ?? []).filter(
    (p) => p.vencimento >= hoje && p.vencimento <= em7diasStr,
  );
  const totalParcelasAVencer = parcelasAVencer.reduce(
    (sum, p) => sum + Number(p.valor),
    0,
  );

  const despesasVencidas = (despesasPendentes ?? []).filter(
    (d) => d.vencimento < hoje,
  );
  const totalDespesasVencidas = despesasVencidas.reduce(
    (sum, d) => sum + Number(d.valor),
    0,
  );

  const faturamentoMes = (pagamentosMes ?? []).reduce(
    (sum, p) => sum + Number(p.valor),
    0,
  );
  const comissoesMesTotal = (comissoesMes ?? []).reduce(
    (sum, c) => sum + Number(c.valor_comissao),
    0,
  );
  const despesasPagasMesTotal = (despesasPagasMes ?? []).reduce(
    (sum, d) => sum + Number(d.valor),
    0,
  );
  const resultadoMes = faturamentoMes - comissoesMesTotal - despesasPagasMesTotal;

  const comissoesPendentesTotalValor = (comissoesPendentesTotal ?? []).reduce(
    (sum, c) => sum + Number(c.valor_comissao),
    0,
  );

  const dataHojeExtenso = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá, {empresa.nome}
        </h1>
        <p className="text-muted-foreground capitalize">
          Painel de hoje — {dataHojeExtenso}
        </p>
      </div>

      {veAgendaHoje && (
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">
              {usuario.perfil === "profissional"
                ? "Minha agenda de hoje"
                : "Agenda de hoje"}
            </h2>
            <Link
              href="/agenda"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Ver agenda completa
            </Link>
          </div>
          <div className="flex flex-col divide-y">
            {(agendamentosHoje ?? []).map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {a.pacientes?.nome ?? "—"}
                  </span>
                  <span className="text-muted-foreground">
                    {formatHora(a.data_hora)} · {a.procedimentos?.nome ?? "—"}
                  </span>
                </div>
                <Badge variant={STATUS_AGENDAMENTO_VARIANT[a.status]}>
                  {STATUS_AGENDAMENTO_LABEL[a.status]}
                </Badge>
              </div>
            ))}
            {(agendamentosHoje ?? []).length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum agendamento hoje.
              </p>
            )}
          </div>
        </div>
      )}

      {veAtendimentoAberto && (atendimentoAbertoCount ?? 0) > 0 && (
        <Link
          href="/atendimento"
          className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm font-medium text-warning-foreground hover:bg-warning/20"
        >
          Você tem um atendimento em aberto — conclua antes de sair.
        </Link>
      )}

      {veComissaoPropria && (
        <Link
          href="/minhas-comissoes"
          className="rounded-lg border bg-card p-4 hover:bg-accent"
        >
          <p className="text-sm text-muted-foreground">
            Comissão pendente de repasse
          </p>
          <p className="text-2xl font-semibold">
            {formatBRL(comissaoPendenteTotal)}
          </p>
        </Link>
      )}

      {veFinanceiro && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/financeiro">
            <Card className="h-full hover:bg-accent">
              <CardHeader>
                <CardDescription>Parcelas atrasadas</CardDescription>
                <CardTitle className="text-2xl">
                  {formatBRL(totalParcelasAtrasadas)}
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/financeiro">
            <Card className="h-full hover:bg-accent">
              <CardHeader>
                <CardDescription>Parcelas a vencer (7 dias)</CardDescription>
                <CardTitle className="text-2xl">
                  {formatBRL(totalParcelasAVencer)}
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/financeiro">
            <Card className="h-full hover:bg-accent">
              <CardHeader>
                <CardDescription>Despesas vencidas</CardDescription>
                <CardTitle className="text-2xl">
                  {formatBRL(totalDespesasVencidas)}
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/financeiro">
            <Card className="h-full hover:bg-accent">
              <CardHeader>
                <CardDescription>
                  Comandas abertas há mais de 2 dias
                </CardDescription>
                <CardTitle className="text-2xl">
                  {comandasAntigasCount ?? 0}
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/financeiro">
            <Card className="h-full hover:bg-accent">
              <CardHeader>
                <CardDescription>Comissões pendentes de repasse</CardDescription>
                <CardTitle className="text-2xl">
                  {formatBRL(comissoesPendentesTotalValor)}
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
          <Card className="h-full">
            <CardHeader>
              <CardDescription>Resultado do mês</CardDescription>
              <CardTitle className="text-2xl">
                {formatBRL(resultadoMes)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {veComercial && (leadsParadosCount ?? 0) > 0 && (
        <Link
          href="/leads"
          className="rounded-lg border bg-card p-4 hover:bg-accent"
        >
          <p className="text-sm text-muted-foreground">
            Leads sem contato há mais de 3 dias
          </p>
          <p className="text-2xl font-semibold">{leadsParadosCount}</p>
        </Link>
      )}

      {veRelatoriosResumo && (
        <Link
          href="/relatorios"
          className="rounded-lg border bg-card p-4 hover:bg-accent"
        >
          <p className="text-sm text-muted-foreground">
            Cancelamentos e faltas (últimos 30 dias)
          </p>
          <p className="text-2xl font-semibold">{cancelamentosCount ?? 0}</p>
        </Link>
      )}
    </div>
  );
}
