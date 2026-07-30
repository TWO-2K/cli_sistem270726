import { notFound } from "next/navigation";
import { CalendarPlus, CircleCheck, ClipboardList } from "lucide-react";
import Link from "next/link";
import { createClient } from "@empresa/supabase/server";
import type {
  Agendamento,
  Anamnese,
  Atendimento,
  Evolucao,
  FotoAtendimento,
  Paciente,
  Prontuario,
} from "@/lib/types/db";
import {
  Card,
  CardHeader,
  CardTitle,
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
import { NovaAnamneseDialog } from "./anamnese-dialog";

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
  ]);

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
          <EditarPacienteDialog paciente={paciente} />
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
        </TabsList>

        <TabsContent value="visao-geral" className="flex flex-col gap-4 pt-4">
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
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      Nenhuma anamnese registrada.
                    </p>
                    <NovaAnamneseDialog pacienteId={id} />
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
              <NovaAnamneseDialog pacienteId={id} />
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
                  {CAMPOS_ANAMNESE.map(
                    (campo) =>
                      a.respostas?.[campo.chave] && (
                        <p key={campo.chave}>
                          <span className="font-medium">{campo.label}:</span>{" "}
                          {a.respostas[campo.chave]}
                        </p>
                      ),
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="atendimentos" className="flex flex-col gap-4 pt-4">
          {(atendimentos ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border bg-card py-10 text-center text-muted-foreground">
              <ClipboardList className="h-6 w-6" />
              Nenhum atendimento registrado ainda para este paciente.
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
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {fotosDoAtendimento.map(
                          (foto) =>
                            foto.signedUrl && (
                              <a
                                key={foto.id}
                                href={foto.signedUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="group relative overflow-hidden rounded-md border"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={foto.signedUrl}
                                  alt={`Foto ${foto.tipo} do atendimento`}
                                  className="aspect-square w-full object-cover transition group-hover:opacity-80"
                                />
                                <Badge
                                  className="absolute bottom-1 left-1"
                                  variant="secondary"
                                >
                                  {foto.tipo === "antes" ? "Antes" : "Depois"}
                                </Badge>
                              </a>
                            ),
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
