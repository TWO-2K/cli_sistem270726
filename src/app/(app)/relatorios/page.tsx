import { createClient } from "@/lib/supabase/server";
import type { Clinica, Usuario } from "@/lib/types/db";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function diaLocal(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export default async function RelatoriosPage() {
  const supabase = await createClient();

  const start30d = new Date();
  start30d.setDate(start30d.getDate() - 30);
  const start30dISO = start30d.toISOString();

  const [
    { data: clinica },
    { data: usuarios },
    { data: atendimentos },
    { data: pagamentos },
    { data: agendamentos },
    { count: cancelamentosCount },
  ] = await Promise.all([
    supabase.from("clinicas").select("*").single<Clinica>(),
    supabase
      .from("usuarios")
      .select("*")
      .eq("atende", true)
      .returns<Usuario[]>(),
    supabase
      .from("atendimentos")
      .select("id, criado_em, usuario_id")
      .gte("criado_em", start30dISO)
      .returns<{ id: string; criado_em: string; usuario_id: string }[]>(),
    supabase
      .from("pagamentos")
      .select("valor, criado_em")
      .eq("status", "pago")
      .gte("criado_em", start30dISO)
      .returns<{ valor: number; criado_em: string }[]>(),
    supabase
      .from("agendamentos")
      .select("id, data_hora, duracao_minutos, status, usuario_id")
      .gte("data_hora", start30dISO)
      .returns<
        {
          id: string;
          data_hora: string;
          duracao_minutos: number;
          status: string;
          usuario_id: string;
        }[]
      >(),
    supabase
      .from("agendamentos")
      .select("id", { count: "exact", head: true })
      .in("status", ["cancelado", "faltou"])
      .gte("data_hora", start30dISO),
  ]);

  const faturamento = (pagamentos ?? []).reduce(
    (sum, p) => sum + Number(p.valor),
    0,
  );

  const usuariosMap = new Map((usuarios ?? []).map((u) => [u.id, u]));

  // Atendimentos e faturamento por dia
  const atendimentosPorDia = new Map<string, number>();
  for (const a of atendimentos ?? []) {
    const dia = diaLocal(a.criado_em);
    atendimentosPorDia.set(dia, (atendimentosPorDia.get(dia) ?? 0) + 1);
  }
  const faturamentoPorDia = new Map<string, number>();
  for (const p of pagamentos ?? []) {
    const dia = diaLocal(p.criado_em);
    faturamentoPorDia.set(
      dia,
      (faturamentoPorDia.get(dia) ?? 0) + Number(p.valor),
    );
  }
  const dias = Array.from(
    new Set([...atendimentosPorDia.keys(), ...faturamentoPorDia.keys()]),
  ).sort((a, b) => b.localeCompare(a));

  // Ocupação de agenda: capacidade (horas de funcionamento x dias) vs horas agendadas
  const horarios = clinica?.horario_funcionamento ?? [];
  let capacidadeHoras = 0;
  const cursor = new Date(start30d);
  const hoje = new Date();
  while (cursor <= hoje) {
    const horario = horarios[cursor.getDay()];
    if (horario?.ativo && horario.inicio && horario.fim) {
      const [hi, mi] = horario.inicio.split(":").map(Number);
      const [hf, mf] = horario.fim.split(":").map(Number);
      const horasDia = hf + mf / 60 - (hi + mi / 60);
      if (horasDia > 0) capacidadeHoras += horasDia;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  const numProfissionais = Math.max(usuarios?.length ?? 0, 1);
  const capacidadeTotalHoras = capacidadeHoras * numProfissionais;

  const agendamentosValidos = (agendamentos ?? []).filter(
    (a) => a.status !== "cancelado" && a.status !== "faltou",
  );
  const horasOcupadas =
    agendamentosValidos.reduce((sum, a) => sum + a.duracao_minutos, 0) / 60;
  const ocupacaoPercentual =
    capacidadeTotalHoras > 0
      ? Math.min((horasOcupadas / capacidadeTotalHoras) * 100, 100)
      : 0;

  // Ocupação por profissional
  const horasPorProfissional = new Map<string, number>();
  for (const a of agendamentosValidos) {
    horasPorProfissional.set(
      a.usuario_id,
      (horasPorProfissional.get(a.usuario_id) ?? 0) + a.duracao_minutos / 60,
    );
  }
  const profissionaisOcupacao = (usuarios ?? [])
    .map((u) => {
      const horasUsuario = horasPorProfissional.get(u.id) ?? 0;
      const pct =
        capacidadeHoras > 0
          ? Math.min((horasUsuario / capacidadeHoras) * 100, 100)
          : 0;
      return { usuario: u, horasUsuario, pct };
    })
    .sort((a, b) => b.horasUsuario - a.horasUsuario);

  const cards = [
    { label: "Atendimentos (30 dias)", value: atendimentos?.length ?? 0 },
    { label: "Faturamento (30 dias)", value: formatBRL(faturamento) },
    { label: "Agendamentos (30 dias)", value: agendamentos?.length ?? 0 },
    {
      label: "Cancelamentos / faltas (30 dias)",
      value: cancelamentosCount ?? 0,
    },
    {
      label: "Ocupação de agenda (30 dias)",
      value: `${ocupacaoPercentual.toFixed(0)}%`,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">
          Visão consolidada dos últimos 30 dias.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-3xl">{card.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-background">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">
              Atendimentos e faturamento por dia
            </h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dia</TableHead>
                <TableHead>Atendimentos</TableHead>
                <TableHead>Faturamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dias.map((dia) => (
                <TableRow key={dia}>
                  <TableCell>{dia.split("-").reverse().join("/")}</TableCell>
                  <TableCell>{atendimentosPorDia.get(dia) ?? 0}</TableCell>
                  <TableCell>
                    {formatBRL(faturamentoPorDia.get(dia) ?? 0)}
                  </TableCell>
                </TableRow>
              ))}
              {dias.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Nenhum dado no período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-lg border bg-background">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">
              Ocupação de agenda por profissional
            </h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead>Horas agendadas</TableHead>
                <TableHead>Ocupação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profissionaisOcupacao.map(({ usuario, horasUsuario, pct }) => (
                <TableRow key={usuario.id}>
                  <TableCell className="font-medium">
                    {usuariosMap.get(usuario.id)?.nome ?? usuario.nome}
                  </TableCell>
                  <TableCell>{horasUsuario.toFixed(1)}h</TableCell>
                  <TableCell>{pct.toFixed(0)}%</TableCell>
                </TableRow>
              ))}
              {profissionaisOcupacao.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Nenhum profissional cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
