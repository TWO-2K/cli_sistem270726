import { notFound } from "next/navigation";
import { CalendarPlus, CircleCheck, ClipboardList } from "lucide-react";
import Link from "next/link";
import { createClient } from "@empresa/supabase/server";
import { requireUsuarioEmpresa } from "@/lib/current-empresa";
import type {
  Agendamento,
  Anamnese,
  AnamneseEstetica,
  AnamneseEsteticaContraindicacao,
  Atendimento,
  Comanda,
  Convenio,
  Evolucao,
  FotoAtendimento,
  PacoteSessao,
  Paciente,
  PlanoTratamento,
  PlanoTratamentoEtapa,
  Procedimento,
  Prontuario,
} from "@/lib/types/db";
import { TIPO_PELE_LABELS } from "@/lib/types/db";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@empresa/ui/components/card";
import { Badge } from "@empresa/ui/components/badge";
import { Button } from "@empresa/ui/components/button";
import { Avatar, AvatarFallback } from "@empresa/ui/components/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@empresa/ui/components/tabs";
import { cn } from "@empresa/ui/utils";
import { iniciaisPaciente, idadeAnos } from "@/lib/pacientes-utils";
import { EditarPacienteDialog } from "./editar-paciente-dialog";
import { ProntuarioDialog } from "./prontuario-dialog";
import { AnamneseDialog } from "./anamnese-dialog";
import { FotosComparador } from "./fotos-comparador";
import { VenderPacoteDialog } from "./vender-pacote-dialog";
import { PlanoTratamentoDialog } from "./plano-tratamento-dialog";
import { PlanosTratamentoLista } from "./planos-tratamento-lista";
import { LgpdPacienteCard } from "./lgpd-paciente-card";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const CAMPOS_ANAMNESE: { chave: keyof Anamnese["respostas"]; label: string }[] = [
  { chave: "queixa_principal", label: "Queixa principal" },
  { chave: "historico_saude", label: "Histórico de saúde relevante" },
  { chave: "alergias", label: "Alergias" },
  { chave: "medicacoes_em_uso", label: "Medicações em uso" },
  { chave: "procedimentos_anteriores", label: "Procedimentos estéticos anteriores" },
];

export default async function PacienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { usuario } = await requireUsuarioEmpresa();
  const supabase = await createClient();

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("*")
    .eq("id", id)
    .maybeSingle<Paciente>();

  if (!paciente) {
    notFound();
  }

  const [
    { data: agendamentos },
    { data: atendimentos },
    { data: evolucoes },
    { data: fotos },
    { data: prontuario },
    { data: anamneses },
    { data: procedimentos },
    { data: pacotesSessao },
    { data: planosTratamento },
    { data: comandas },
    { data: convenios },
  ] = await Promise.all([
    supabase
      .from("agendamentos")
      .select("*")
      .eq("paciente_id", id)
      .returns<Agendamento[]>(),
    supabase
      .from("atendimentos")
      .select("*")
      .eq("paciente_id", id)
      .order("criado_em", { ascending: false })
      .returns<Atendimento[]>(),
    supabase
      .from("evolucoes")
      .select("*")
      .eq("paciente_id", id)
      .order("criado_em", { ascending: false })
      .returns<Evolucao[]>(),
    supabase
      .from("fotos_atendimento")
      .select("*")
      .eq("paciente_id", id)
      .order("criado_em", { ascending: false })
      .returns<FotoAtendimento[]>(),
    supabase
      .from("prontuarios")
      .select("*")
      .eq("paciente_id", id)
      .maybeSingle<Prontuario>(),
    supabase
      .from("anamneses")
      .select("*")
      .eq("paciente_id", id)
      .order("criado_em", { ascending: false })
      .returns<Anamnese[]>(),
    supabase.from("procedimentos").select("*").returns<Procedimento[]>(),
    supabase
      .from("pacotes_sessao")
      .select("*")
      .eq("paciente_id", id)
      .order("criado_em", { ascending: false })
      .returns<PacoteSessao[]>(),
    supabase
      .from("planos_tratamento")
      .select("*")
      .eq("paciente_id", id)
      .order("criado_em", { ascending: false })
      .returns<PlanoTratamento[]>(),
    supabase
      .from("comandas")
      .select("*")
      .eq("paciente_id", id)
      .returns<Comanda[]>(),
    supabase.from("convenios").select("*").order("nome").returns<Convenio[]>(),
  ]);

  const planoIds = (planosTratamento ?? []).map((p) => p.id);
  const { data: etapasPlanoTratamento } =
    planoIds.length > 0
      ? await supabase
          .from("plano_tratamento_etapas")
          .select("*")
          .in("plano_id", planoIds)
          .returns<PlanoTratamentoEtapa[]>()
      : { data: [] as PlanoTratamentoEtapa[] };

  const anamneseIds = (anamneses ?? []).map((a) => a.id);
  const [{ data: anamnesesEstetica }, { data: contraindicacoes }] =
    anamneseIds.length > 0
      ? await Promise.all([
          supabase
            .schema("estetica")
            .from("anamnese_estetica")
            .select("*")
            .in("anamnese_id", anamneseIds)
            .returns<AnamneseEstetica[]>(),
          supabase
            .schema("estetica")
            .from("anamnese_estetica_contraindicacao")
            .select("*")
            .in("anamnese_id", anamneseIds)
            .returns<AnamneseEsteticaContraindicacao[]>(),
        ])
      : [{ data: [] as AnamneseEstetica[] }, { data: [] as AnamneseEsteticaContraindicacao[] }];

  const procedimentoNomePorId = new Map(
    (procedimentos ?? []).map((p) => [p.id, p.nome]),
  );
  const tipoPelePorAnamneseId = new Map(
    (anamnesesEstetica ?? [])
      .filter((ae) => ae.tipo_pele != null)
      .map((ae) => [ae.anamnese_id, ae.tipo_pele!]),
  );
  const contraindicacoesPorAnamneseId = new Map<string, string[]>();
  (contraindicacoes ?? []).forEach((c) => {
    const nome = procedimentoNomePorId.get(c.procedimento_id);
    if (!nome) return;
    const lista = contraindicacoesPorAnamneseId.get(c.anamnese_id) ?? [];
    lista.push(nome);
    contraindicacoesPorAnamneseId.set(c.anamnese_id, lista);
  });
  const anamnesesUsadasIds = new Set(
    (atendimentos ?? [])
      .map((a) => a.anamnese_id)
      .filter((idAnamnese): idAnamnese is string => !!idAnamnese),
  );

  const fotosComUrl = await Promise.all(
    (fotos ?? []).map(async (foto) => {
      const { data } = await supabase.storage
        .from("fotos-atendimento")
        .createSignedUrl(foto.url, 3600);
      return { ...foto, signedUrl: data?.signedUrl ?? null };
    }),
  );

  // Mesma lógica de status usada na listagem de pacientes (pacientes/page.tsx).
  // Server Component: roda uma vez por request, não é re-render de cliente.
  // eslint-disable-next-line react-hooks/purity
  const agora = Date.now();
  const temHistorico =
    (agendamentos?.length ?? 0) > 0 ||
    (atendimentos?.length ?? 0) > 0 ||
    (evolucoes?.length ?? 0) > 0 ||
    (fotos?.length ?? 0) > 0 ||
    (anamneses?.length ?? 0) > 0 ||
    !!prontuario;
  const emTratamento =
    (agendamentos ?? []).some(
      (a) =>
        (a.status === "agendado" || a.status === "confirmado") &&
        new Date(a.data_hora).getTime() >= agora,
    ) || (atendimentos ?? []).some((a) => a.status === "em_andamento");
  const status = !temHistorico
    ? "novo"
    : emTratamento
      ? "em_tratamento"
      : "sem_atividade";

  const evolucoesPorAtendimento = new Map<string, Evolucao[]>();
  (evolucoes ?? []).forEach((e) => {
    const lista = evolucoesPorAtendimento.get(e.atendimento_id) ?? [];
    lista.push(e);
    evolucoesPorAtendimento.set(e.atendimento_id, lista);
  });
  const fotosPorAtendimento = new Map<string, typeof fotosComUrl>();
  fotosComUrl.forEach((f) => {
    const lista = fotosPorAtendimento.get(f.atendimento_id) ?? [];
    lista.push(f);
    fotosPorAtendimento.set(f.atendimento_id, lista);
  });

  const ultimoAtendimento = (atendimentos ?? [])[0];
  const ultimaEvolucaoDoUltimoAtendimento = ultimoAtendimento
    ? (evolucoesPorAtendimento.get(ultimoAtendimento.id) ?? [])[0]
    : undefined;
  const anamneseRecente = (anamneses ?? [])[0];

  const totalInvestido = (comandas ?? [])
    .filter((c) => c.status === "fechada")
    .reduce((soma, c) => soma + c.total, 0);

  const proximoAgendamento = (agendamentos ?? [])
    .filter(
      (a) =>
        (a.status === "agendado" || a.status === "confirmado") &&
        new Date(a.data_hora).getTime() >= agora,
    )
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())[0];

  const pacotesAtivos = (pacotesSessao ?? []).filter(
    (p) => p.sessoes_utilizadas < p.sessoes_total,
  );
  const sessoesRestantes = pacotesAtivos.reduce(
    (soma, p) => soma + (p.sessoes_total - p.sessoes_utilizadas),
    0,
  );

  const planoAtivo = (planosTratamento ?? []).find((p) => p.status === "ativo");
  const etapasDoPlanoAtivo = planoAtivo
    ? (etapasPlanoTratamento ?? []).filter((e) => e.plano_id === planoAtivo.id)
    : [];
  const etapasConcluidasDoPlanoAtivo = etapasDoPlanoAtivo.filter(
    (e) => e.status === "concluida",
  ).length;

  const contraindicacoesRecentes = anamneseRecente
    ? (contraindicacoesPorAnamneseId.get(anamneseRecente.id) ?? [])
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Avatar size="lg" className="mt-0.5">
            <AvatarFallback className="bg-blue-100 font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
              {iniciaisPaciente(paciente.nome)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {paciente.nome}
              </h1>
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                  status === "novo" &&
                    "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
                  status === "em_tratamento" &&
                    "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
                  status === "sem_atividade" &&
                    "bg-muted text-muted-foreground",
                )}
              >
                {status === "novo"
                  ? "Novo"
                  : status === "em_tratamento"
                    ? "Em tratamento"
                    : "Sem atividade"}
              </span>
            </div>
            <p className="text-muted-foreground">
              {paciente.telefone ?? "Sem telefone"} ·{" "}
              {paciente.email ?? "Sem e-mail"}
            </p>
            <p className="text-muted-foreground">
              {paciente.data_nascimento
                ? `Nascimento: ${paciente.data_nascimento
                    .split("-")
                    .reverse()
                    .join("/")} (${idadeAnos(paciente.data_nascimento)} anos)`
                : "Data de nascimento não informada"}
              {" · "}
              {paciente.endereco ?? "Endereço não informado"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/agenda" />}>
            <CalendarPlus className="h-4 w-4" />
            Agendar
          </Button>
          <EditarPacienteDialog paciente={paciente} convenios={convenios ?? []} />
        </div>
      </div>

      <Tabs defaultValue="visao-geral">
        <TabsList>
          <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
          <TabsTrigger value="anamnese">
            Anamnese
            {(anamneses?.length ?? 0) > 0 ? ` (${anamneses!.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="atendimentos">
            Atendimentos
            {(atendimentos?.length ?? 0) > 0 ? ` (${atendimentos!.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="pacotes">
            Pacotes
            {(pacotesSessao?.length ?? 0) > 0 ? ` (${pacotesSessao!.length})` : ""}
          </TabsTrigger>
          {usuario.perfil === "admin" && (
            <TabsTrigger value="lgpd">LGPD</TabsTrigger>
          )}
          <TabsTrigger value="planos-tratamento">
            Plano de tratamento
            {(planosTratamento?.length ?? 0) > 0 ? ` (${planosTratamento!.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="flex flex-col gap-4 pt-4">
          {contraindicacoesRecentes.length > 0 && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              Contraindicado para: {contraindicacoesRecentes.join(", ")}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardDescription>Total investido</CardDescription>
                <CardTitle className="text-2xl">{formatBRL(totalInvestido)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Próximo agendamento</CardDescription>
                <CardTitle className="text-2xl">
                  {proximoAgendamento
                    ? new Date(proximoAgendamento.data_hora).toLocaleDateString("pt-BR")
                    : "—"}
                </CardTitle>
                {!proximoAgendamento && (
                  <p className="text-sm text-muted-foreground">Nenhum agendado</p>
                )}
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Pacotes ativos</CardDescription>
                <CardTitle className="text-2xl">{pacotesAtivos.length}</CardTitle>
                {pacotesAtivos.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {sessoesRestantes} sessões restantes
                  </p>
                )}
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Plano de tratamento</CardDescription>
                <CardTitle className="text-2xl">
                  {planoAtivo
                    ? `${etapasConcluidasDoPlanoAtivo}/${etapasDoPlanoAtivo.length}`
                    : "—"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {planoAtivo ? "etapas concluídas" : "Nenhum plano ativo"}
                </p>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Prontuário</CardTitle>
              <ProntuarioDialog pacienteId={id} temProntuario={!!prontuario} />
            </CardHeader>
            <CardContent>
              {prontuario ? (
                <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <CircleCheck className="h-4 w-4" />
                  Prontuário aberto em{" "}
                  {new Date(prontuario.criado_em).toLocaleDateString("pt-BR")}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Prontuário ainda não aberto para este paciente.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Anamnese mais recente</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {anamneseRecente ? (
                  <>
                    <p>
                      <span className="font-medium">Queixa principal:</span>{" "}
                      {anamneseRecente.respostas.queixa_principal || "—"}
                    </p>
                    <p>
                      <span className="font-medium">Alergias:</span>{" "}
                      {anamneseRecente.respostas.alergias || "—"}
                    </p>
                    {tipoPelePorAnamneseId.has(anamneseRecente.id) && (
                      <p>
                        <span className="font-medium">Tipo de pele:</span>{" "}
                        {TIPO_PELE_LABELS[tipoPelePorAnamneseId.get(anamneseRecente.id)!]}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      Nenhuma anamnese registrada.
                    </p>
                    <AnamneseDialog pacienteId={id} procedimentos={procedimentos ?? []} />
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Último atendimento</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {ultimoAtendimento ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span>
                        {new Date(ultimoAtendimento.criado_em).toLocaleString(
                          "pt-BR",
                        )}
                      </span>
                      <Badge
                        variant={
                          ultimoAtendimento.status === "concluido"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {ultimoAtendimento.status === "concluido"
                          ? "Concluído"
                          : "Em andamento"}
                      </Badge>
                    </div>
                    {ultimaEvolucaoDoUltimoAtendimento && (
                      <p className="text-muted-foreground line-clamp-2">
                        {ultimaEvolucaoDoUltimoAtendimento.texto}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    Nenhum atendimento registrado ainda.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="anamnese" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Anamnese</CardTitle>
              <AnamneseDialog pacienteId={id} procedimentos={procedimentos ?? []} />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {(anamneses ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma anamnese registrada ainda.
                </p>
              )}
              {(anamneses ?? []).map((a, index) => (
                <div
                  key={a.id}
                  className={cn(
                    "flex flex-col gap-2 rounded-md border px-3 py-2 text-sm",
                    index === 0 && "border-primary/30",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.criado_em).toLocaleString("pt-BR")}
                      </p>
                      {index === 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Mais recente
                        </Badge>
                      )}
                    </div>
                    {!anamnesesUsadasIds.has(a.id) && (
                      <AnamneseDialog
                        pacienteId={id}
                        procedimentos={procedimentos ?? []}
                        anamnese={{
                          id: a.id,
                          respostas: a.respostas,
                          tipoPele: tipoPelePorAnamneseId.get(a.id) ?? null,
                          contraindicados: (contraindicacoes ?? [])
                            .filter((c) => c.anamnese_id === a.id)
                            .map((c) => c.procedimento_id),
                        }}
                      />
                    )}
                  </div>
                  {CAMPOS_ANAMNESE.map(
                    (campo) =>
                      a.respostas?.[campo.chave] && (
                        <p key={campo.chave}>
                          <span className="font-medium">{campo.label}:</span>{" "}
                          {a.respostas[campo.chave]}
                        </p>
                      ),
                  )}
                  {tipoPelePorAnamneseId.has(a.id) && (
                    <p>
                      <span className="font-medium">Tipo de pele:</span>{" "}
                      {TIPO_PELE_LABELS[tipoPelePorAnamneseId.get(a.id)!]}
                    </p>
                  )}
                  {(contraindicacoesPorAnamneseId.get(a.id) ?? []).length > 0 && (
                    <p>
                      <span className="font-medium">
                        Contraindicado para:
                      </span>{" "}
                      {contraindicacoesPorAnamneseId.get(a.id)!.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="atendimentos" className="flex flex-col gap-4 pt-4">
          {(atendimentos ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border bg-card py-10 text-center text-muted-foreground">
              <ClipboardList className="h-6 w-6" />
              <p>Nenhum atendimento registrado ainda para este paciente.</p>
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/atendimento" />}>
                <CalendarPlus className="h-4 w-4" />
                Iniciar atendimento
              </Button>
            </div>
          ) : (
            (atendimentos ?? []).map((a) => {
              const evolucoesDoAtendimento = evolucoesPorAtendimento.get(a.id) ?? [];
              const fotosDoAtendimento = fotosPorAtendimento.get(a.id) ?? [];
              return (
                <Card key={a.id}>
                  <CardHeader className="flex flex-row items-center justify-between border-b">
                    <CardTitle className="text-base font-normal">
                      {new Date(a.criado_em).toLocaleString("pt-BR")}
                    </CardTitle>
                    <Badge variant={a.status === "concluido" ? "default" : "secondary"}>
                      {a.status === "concluido" ? "Concluído" : "Em andamento"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    {evolucoesDoAtendimento.length === 0 &&
                      fotosDoAtendimento.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Sem registro de evolução ou fotos para este atendimento.
                        </p>
                      )}
                    {evolucoesDoAtendimento.map((e) => (
                      <div key={e.id} className="text-sm">
                        <p className="mb-1 text-xs text-muted-foreground">
                          {new Date(e.criado_em).toLocaleString("pt-BR")}
                        </p>
                        <p>{e.texto}</p>
                      </div>
                    ))}
                    {fotosDoAtendimento.length > 0 && (
                      <FotosComparador
                        fotos={fotosDoAtendimento.filter(
                          (f): f is typeof f & { signedUrl: string } =>
                            !!f.signedUrl,
                        )}
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="pacotes" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Pacotes de sessões</CardTitle>
              <VenderPacoteDialog pacienteId={id} procedimentos={procedimentos ?? []} />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {(pacotesSessao ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum pacote vendido para este paciente ainda.
                </p>
              )}
              {(pacotesSessao ?? []).map((pacote) => {
                const restantes = pacote.sessoes_total - pacote.sessoes_utilizadas;
                const concluido = restantes === 0;
                return (
                  <div
                    key={pacote.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {procedimentoNomePorId.get(pacote.procedimento_id) ??
                          "Procedimento removido"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Vendido em{" "}
                        {new Date(pacote.criado_em).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Badge variant={concluido ? "secondary" : "default"}>
                      {pacote.sessoes_utilizadas}/{pacote.sessoes_total} sessões
                      {concluido ? " · concluído" : ` · ${restantes} restantes`}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planos-tratamento" className="flex flex-col gap-4 pt-4">
          <div className="flex justify-end">
            <PlanoTratamentoDialog pacienteId={id} procedimentos={procedimentos ?? []} />
          </div>
          <PlanosTratamentoLista
            planos={planosTratamento ?? []}
            etapas={etapasPlanoTratamento ?? []}
            procedimentos={procedimentos ?? []}
          />
        </TabsContent>

        {usuario.perfil === "admin" && (
          <TabsContent value="lgpd" className="pt-4">
            <LgpdPacienteCard pacienteId={id} pacienteNome={paciente.nome} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
