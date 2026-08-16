import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@empresa/supabase/server";
import { requireUsuarioEmpresa } from "@/lib/current-empresa";
import type { Agendamento, Paciente, Procedimento, Sala, Usuario } from "@/lib/types/db";
import { cn } from "@empresa/ui/utils";
import { NovoAgendamentoDialog } from "./novo-agendamento-dialog";
import { AgendaGrid } from "./agenda-grid";
import {
  addDias,
  fimDoDia,
  formatDataParam,
  formatRangeLabel,
  inicioDaSemana,
  inicioDoDia,
  parseDataParam,
} from "./agenda-utils";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; data?: string }>;
}) {
  const { empresa } = await requireUsuarioEmpresa();
  const params = await searchParams;
  const view: "semana" | "dia" = params.view === "dia" ? "dia" : "semana";
  const ref = parseDataParam(params.data);
  const hoje = new Date();

  const dias =
    view === "dia"
      ? [ref]
      : Array.from({ length: 7 }, (_, i) => addDias(inicioDaSemana(ref), i));

  const rangeInicio = inicioDoDia(dias[0]);
  const rangeFim = fimDoDia(dias[dias.length - 1]);

  const anteriorRef = formatDataParam(addDias(ref, view === "dia" ? -1 : -7));
  const proximoRef = formatDataParam(addDias(ref, view === "dia" ? 1 : 7));
  const hojeRef = formatDataParam(hoje);

  const supabase = await createClient();

  const [
    { data: agendamentos },
    { data: pacientes },
    { data: profissionais },
    { data: salas },
    { data: procedimentos },
  ] = await Promise.all([
    supabase
      .from("agendamentos")
      .select("*")
      .gte("data_hora", rangeInicio.toISOString())
      .lte("data_hora", rangeFim.toISOString())
      .order("data_hora")
      .returns<Agendamento[]>(),
    supabase.from("pacientes").select("*").order("nome").returns<Paciente[]>(),
    supabase
      .from("usuarios")
      .select("*")
      .eq("atende", true)
      .eq("ativo", true)
      .order("nome")
      .returns<Usuario[]>(),
    supabase.from("salas").select("*").order("nome").returns<Sala[]>(),
    supabase
      .from("procedimentos")
      .select("*")
      .order("nome")
      .returns<Procedimento[]>(),
  ]);

  const pacientesMap = new Map((pacientes ?? []).map((p) => [p.id, p]));
  const profissionaisMap = new Map(
    (profissionais ?? []).map((p) => [p.id, p]),
  );
  const procedimentosMap = new Map(
    (procedimentos ?? []).map((p) => [p.id, p]),
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-muted-foreground">
            Visão semanal ou diária dos atendimentos.
          </p>
        </div>
        <NovoAgendamentoDialog
          pacientes={pacientes ?? []}
          profissionais={profissionais ?? []}
          salas={salas ?? []}
          procedimentos={procedimentos ?? []}
          horarioFuncionamento={empresa.horario_funcionamento}
        />
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/agenda?view=${view}&data=${anteriorRef}`}
            className="flex size-8 items-center justify-center rounded-lg border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <Link
            href={`/agenda?view=${view}&data=${hojeRef}`}
            className="flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Hoje
          </Link>
          <Link
            href={`/agenda?view=${view}&data=${proximoRef}`}
            className="flex size-8 items-center justify-center rounded-lg border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronRight className="size-4" />
          </Link>
          <span className="ml-2 text-sm font-semibold capitalize">
            {formatRangeLabel(view, ref)}
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {(["semana", "dia"] as const).map((v) => (
            <Link
              key={v}
              href={`/agenda?view=${v}&data=${formatDataParam(ref)}`}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors",
                view === v
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v}
            </Link>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <AgendaGrid
          dias={dias}
          agendamentos={agendamentos ?? []}
          pacientesMap={pacientesMap}
          profissionaisMap={profissionaisMap}
          procedimentosMap={procedimentosMap}
          hoje={hoje}
          agora={hoje}
          pacientes={pacientes ?? []}
          profissionais={profissionais ?? []}
          salas={salas ?? []}
          procedimentos={procedimentos ?? []}
          horarioFuncionamento={empresa.horario_funcionamento}
        />
      </div>
    </div>
  );
}
