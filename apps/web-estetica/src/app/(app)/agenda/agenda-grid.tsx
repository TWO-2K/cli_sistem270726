"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@empresa/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@empresa/ui/components/sheet";
import type {
  Agendamento,
  HorarioDia,
  Paciente,
  Procedimento,
  Sala,
  Usuario,
} from "@/lib/types/db";
import { cn } from "@empresa/ui/utils";
import {
  AgendamentoCard,
  STATUS_ARRASTAVEIS,
  STATUS_ESTILO,
  type DragStartInfo,
} from "./agendamento-card";
import { AgendamentoFormDialog } from "./agendamento-form-dialog";
import {
  DIAS_SEMANA,
  HORA_ALTURA_PX,
  MIN_COL_PX,
  componentesEmSaoPaulo,
  corDoProfissional,
  diaDaSemanaEmSaoPaulo,
  ehMesmoDia,
  horarioDoDia,
  horaDentroDoExpediente,
  instanteSaoPaulo,
  layoutEventosDoDia,
  limitesGrid,
  periodoDentroDoExpediente,
  snapMinutos,
} from "./agenda-utils";

function horaLabel(hora: number) {
  return `${String(hora).padStart(2, "0")}:00`;
}

interface DragState {
  agendamento: Agendamento;
  pointerOffsetX: number;
  pointerOffsetY: number;
  widthPx: number;
  heightPx: number;
  clientX: number;
  clientY: number;
  colIndex: number | null;
  novoTopPx: number | null;
  valido: boolean;
}

export function AgendaGrid({
  dias,
  agendamentos,
  pacientesMap,
  profissionaisMap,
  procedimentosMap,
  hoje,
  agora,
  pacientes,
  profissionais,
  salas,
  procedimentos,
  horarioFuncionamento,
}: {
  dias: Date[];
  agendamentos: Agendamento[];
  pacientesMap: Map<string, Paciente>;
  profissionaisMap: Map<string, Usuario>;
  procedimentosMap: Map<string, Procedimento>;
  hoje: Date;
  agora: Date;
  pacientes: Paciente[];
  profissionais: Usuario[];
  salas: Sala[];
  procedimentos: Procedimento[];
  horarioFuncionamento: HorarioDia[];
}) {
  const router = useRouter();
  const [slotSelecionado, setSlotSelecionado] = useState<Date | null>(null);
  const [pendingMoves, setPendingMoves] = useState<Map<string, Date>>(
    new Map(),
  );
  const [drag, setDrag] = useState<DragState | null>(null);
  const [resumoAberto, setResumoAberto] = useState<Agendamento[] | null>(null);

  const [agendamentosAnteriores, setAgendamentosAnteriores] =
    useState(agendamentos);
  if (agendamentos !== agendamentosAnteriores) {
    setAgendamentosAnteriores(agendamentos);
    setPendingMoves(new Map());
  }

  const { inicio: gridInicioHora, fim: gridFimHora } = limitesGrid(
    horarioFuncionamento,
    dias,
  );
  const horas = Array.from(
    { length: gridFimHora - gridInicioHora },
    (_, i) => gridInicioHora + i,
  );
  const alturaTotal = horas.length * HORA_ALTURA_PX;

  const minutosGridInicio = gridInicioHora * 60;
  const agoraSP = componentesEmSaoPaulo(agora);
  const minutosAgora = agoraSP.hora * 60 + agoraSP.minuto;
  const mostrarLinhaAgora =
    minutosAgora >= minutosGridInicio &&
    minutosAgora <= gridFimHora * 60;

  const profissionalCorMap = useMemo(() => {
    const ordem = profissionais.map((p) => p.id);
    return new Map(
      profissionais.map((p) => [p.id, corDoProfissional(p.id, ordem)]),
    );
  }, [profissionais]);

  const agendamentosPorDia = useMemo(() => {
    const map = new Map<number, Agendamento[]>();
    for (const ag of agendamentos) {
      const pendente = pendingMoves.get(ag.id);
      const dataEfetiva = pendente ?? new Date(ag.data_hora);
      const idx = dias.findIndex((d) => ehMesmoDia(d, dataEfetiva));
      if (idx === -1) continue;
      const item = pendente ? { ...ag, data_hora: pendente.toISOString() } : ag;
      if (!map.has(idx)) map.set(idx, []);
      map.get(idx)!.push(item);
    }
    return map;
  }, [agendamentos, dias, pendingMoves]);

  function abrirNovoAgendamento(dia: Date, hora: number) {
    const { ano, mes, dia: numDia } = componentesEmSaoPaulo(dia);
    setSlotSelecionado(instanteSaoPaulo(ano, mes, numDia, hora, 0, 0, 0));
  }

  function calcularAlvo(
    clientX: number,
    clientY: number,
    estado: DragState,
  ): {
    colIndex: number | null;
    novoTopPx: number | null;
    valido: boolean;
    minutosAbs?: number;
  } {
    const cardTopViewport = clientY - estado.pointerOffsetY;
    const elAlvo = document
      .elementFromPoint(clientX, cardTopViewport + 1)
      ?.closest("[data-dia-col]") as HTMLElement | null;

    if (!elAlvo) {
      return { colIndex: null, novoTopPx: null, valido: false };
    }

    const colIndex = Number(elAlvo.dataset.diaCol);
    const colRect = elAlvo.getBoundingClientRect();
    const topInCol = cardTopViewport - colRect.top;
    const minutosFromStart = (topInCol / HORA_ALTURA_PX) * 60;
    let minutosAbs = snapMinutos(minutosGridInicio + minutosFromStart);
    const duracao = estado.agendamento.duracao_minutos;
    minutosAbs = Math.max(
      minutosGridInicio,
      Math.min(minutosAbs, gridFimHora * 60 - duracao),
    );

    const horarioDia = horarioDoDia(horarioFuncionamento, dias[colIndex]);
    const valido = periodoDentroDoExpediente(horarioDia, minutosAbs, duracao);
    const novoTopPx = ((minutosAbs - minutosGridInicio) / 60) * HORA_ALTURA_PX;

    return { colIndex, novoTopPx, valido, minutosAbs };
  }

  function handleDragStart(agendamento: Agendamento, info: DragStartInfo) {
    setDrag({
      agendamento,
      pointerOffsetX: info.pointerOffsetX,
      pointerOffsetY: info.pointerOffsetY,
      widthPx: info.widthPx,
      heightPx: info.heightPx,
      clientX: info.clientX,
      clientY: info.clientY,
      colIndex: null,
      novoTopPx: null,
      valido: false,
    });
  }

  function handleDragMove(clientX: number, clientY: number) {
    setDrag((atual) => {
      if (!atual) return atual;
      const alvo = calcularAlvo(clientX, clientY, atual);
      return {
        ...atual,
        clientX,
        clientY,
        colIndex: alvo.colIndex,
        novoTopPx: alvo.novoTopPx,
        valido: alvo.valido,
      };
    });
  }

  async function handleDragEnd(clientX: number, clientY: number) {
    const atual = drag;
    setDrag(null);
    if (!atual) return;

    const alvo = calcularAlvo(clientX, clientY, atual);
    if (alvo.colIndex === null || !alvo.valido || alvo.minutosAbs === undefined) {
      return;
    }

    const { ano, mes, dia: numDia } = componentesEmSaoPaulo(dias[alvo.colIndex]);
    const novaData = instanteSaoPaulo(
      ano,
      mes,
      numDia,
      0,
      alvo.minutosAbs,
      0,
      0,
    );

    const dataOriginal = new Date(atual.agendamento.data_hora);
    if (novaData.getTime() === dataOriginal.getTime()) {
      return;
    }

    setPendingMoves((prev) => new Map(prev).set(atual.agendamento.id, novaData));

    const supabase = createClient();
    const { error } = await supabase
      .from("agendamentos")
      .update({ data_hora: novaData.toISOString() })
      .eq("id", atual.agendamento.id);

    if (error) {
      setPendingMoves((prev) => {
        const next = new Map(prev);
        next.delete(atual.agendamento.id);
        return next;
      });
      if (error.code === "23P01") {
        toast.error(
          "Já existe um agendamento nesse horário para o profissional ou paciente selecionado.",
        );
      } else {
        toast.error("Não foi possível mover o agendamento.");
      }
      return;
    }

    router.refresh();
  }

  const dragPaciente = drag
    ? pacientesMap.get(drag.agendamento.paciente_id)
    : undefined;
  const dragProcedimento =
    drag && drag.agendamento.procedimento_id
      ? procedimentosMap.get(drag.agendamento.procedimento_id)
      : undefined;
  const dragEstilo = drag ? STATUS_ESTILO[drag.agendamento.status] : undefined;
  const dragCorProfissional = drag
    ? profissionalCorMap.get(drag.agendamento.usuario_id)
    : undefined;

  function noop() {}

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-card">
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <div
          className="relative grid"
          style={{
            gridTemplateColumns: `64px repeat(${dias.length}, minmax(${MIN_COL_PX}px, 1fr))`,
          }}
        >
          <div className="sticky top-0 z-20 border-r border-b bg-background" />
          {dias.map((dia, i) => {
            const ehHoje = ehMesmoDia(dia, hoje);
            const diaFechado = !horarioDoDia(horarioFuncionamento, dia)?.ativo;
            const { ano: anoDia, mes: mesDia, dia: numDia } =
              componentesEmSaoPaulo(dia);
            return (
              <div
                key={i}
                className={cn(
                  "sticky top-0 z-20 flex flex-col items-center gap-0.5 border-r border-b bg-background p-2 last:border-r-0",
                  ehHoje && "bg-accent/40",
                )}
              >
                <span className="text-xs font-medium text-muted-foreground capitalize">
                  {DIAS_SEMANA[diaDaSemanaEmSaoPaulo(anoDia, mesDia, numDia)]}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    ehHoje && "text-primary",
                  )}
                >
                  {String(numDia).padStart(2, "0")}/
                  {String(mesDia).padStart(2, "0")}
                </span>
                {diaFechado && (
                  <span className="text-[10px] uppercase text-muted-foreground/70">
                    Fechado
                  </span>
                )}
              </div>
            );
          })}

          <div className="relative border-r">
            {horas.map((hora) => (
              <div
                key={hora}
                className="flex items-start justify-end border-b pr-2 pt-0.5 text-xs text-muted-foreground"
                style={{ height: HORA_ALTURA_PX }}
              >
                <span>{horaLabel(hora)}</span>
              </div>
            ))}
          </div>

          {dias.map((dia, colIndex) => {
            const ehHoje = ehMesmoDia(dia, hoje);
            const agendamentosDoDia = agendamentosPorDia.get(colIndex) ?? [];
            const layout = layoutEventosDoDia(agendamentosDoDia);
            const horarioDia = horarioDoDia(horarioFuncionamento, dia);
            const diaFechado = !horarioDia?.ativo;

            return (
              <div
                key={colIndex}
                data-dia-col={colIndex}
                className={cn(
                  "relative border-r last:border-r-0",
                  ehHoje && "bg-accent/20",
                  diaFechado && "bg-muted/30",
                )}
                style={{ height: alturaTotal }}
              >
                {horas.map((hora) => {
                  const disponivel = horaDentroDoExpediente(horarioDia, hora);
                  return (
                    <button
                      key={hora}
                      type="button"
                      disabled={!disponivel}
                      onClick={() => abrirNovoAgendamento(dia, hora)}
                      className={cn(
                        "block w-full border-b",
                        disponivel
                          ? "cursor-pointer hover:bg-accent/30"
                          : "cursor-not-allowed bg-muted/20",
                      )}
                      style={{ height: HORA_ALTURA_PX }}
                    />
                  );
                })}

                {ehHoje && mostrarLinhaAgora && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                    style={{
                      top:
                        ((minutosAgora - minutosGridInicio) / 60) *
                        HORA_ALTURA_PX,
                    }}
                  >
                    <div className="size-1.5 rounded-full bg-destructive" />
                    <div className="h-px flex-1 bg-destructive" />
                  </div>
                )}

                {drag && drag.colIndex === colIndex && drag.novoTopPx !== null && (
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-x-1 z-10 rounded-md border-2 border-dashed",
                      drag.valido
                        ? "border-primary bg-primary/10"
                        : "border-destructive bg-destructive/10",
                    )}
                    style={{ top: drag.novoTopPx, height: drag.heightPx }}
                  />
                )}

                {layout.map((item) => {
                  const largura = 100 / item.cols;

                  if (item.tipo === "resumo") {
                    const inicioResumoSP = componentesEmSaoPaulo(
                      new Date(item.inicioMs),
                    );
                    const minutosInicio =
                      inicioResumoSP.hora * 60 + inicioResumoSP.minuto;
                    const top =
                      ((minutosInicio - minutosGridInicio) / 60) *
                      HORA_ALTURA_PX;
                    const altura = Math.max(
                      ((item.fimMs - item.inicioMs) / 60_000 / 60) *
                        HORA_ALTURA_PX,
                      20,
                    );

                    return (
                      <button
                        key={`resumo-${colIndex}-${item.inicioMs}`}
                        type="button"
                        onClick={() => setResumoAberto(item.agendamentos)}
                        className="absolute box-border overflow-hidden rounded-md border border-dashed border-muted-foreground/40 bg-muted/60 px-2 py-1 text-left text-xs font-medium text-muted-foreground shadow-sm transition hover:bg-muted hover:z-10"
                        style={{
                          top,
                          height: altura,
                          left: `calc(${largura * item.col}% + 2px)`,
                          width: `calc(${largura}% - 4px)`,
                        }}
                      >
                        +{item.agendamentos.length} agendamento
                        {item.agendamentos.length > 1 ? "s" : ""}
                      </button>
                    );
                  }

                  const { agendamento, col, cols } = item;
                  const inicioSP = componentesEmSaoPaulo(
                    new Date(agendamento.data_hora),
                  );
                  const minutosInicio = inicioSP.hora * 60 + inicioSP.minuto;
                  const top =
                    ((minutosInicio - minutosGridInicio) / 60) *
                    HORA_ALTURA_PX;
                  const altura = Math.max(
                    (agendamento.duracao_minutos / 60) * HORA_ALTURA_PX,
                    20,
                  );
                  const larguraEvento = 100 / cols;
                  const paciente = pacientesMap.get(agendamento.paciente_id);
                  const profissional = profissionaisMap.get(
                    agendamento.usuario_id,
                  );
                  const procedimento = agendamento.procedimento_id
                    ? procedimentosMap.get(agendamento.procedimento_id)
                    : undefined;

                  return (
                    <AgendamentoCard
                      key={agendamento.id}
                      agendamento={agendamento}
                      paciente={paciente}
                      profissional={profissional}
                      procedimento={procedimento}
                      corProfissional={profissionalCorMap.get(
                        agendamento.usuario_id,
                      )}
                      arrastavel={STATUS_ARRASTAVEIS.includes(agendamento.status)}
                      arrastando={drag?.agendamento.id === agendamento.id}
                      onDragStart={handleDragStart}
                      onDragMove={handleDragMove}
                      onDragEnd={handleDragEnd}
                      style={{
                        top,
                        height: altura,
                        left: `calc(${larguraEvento * col}% + 2px)`,
                        width: `calc(${larguraEvento}% - 4px)`,
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {drag && dragEstilo && (
        <div
          className={cn(
            "pointer-events-none fixed z-50 box-border overflow-hidden rounded-md border-y border-r px-2 py-1 text-left text-xs shadow-lg",
            dragCorProfissional ? "border-l-4" : "border-l",
            dragEstilo.bg,
            dragEstilo.borda,
          )}
          style={{
            top: drag.clientY - drag.pointerOffsetY,
            left: drag.clientX - drag.pointerOffsetX,
            width: drag.widthPx,
            height: drag.heightPx,
            ...(dragCorProfissional
              ? { borderLeftColor: dragCorProfissional }
              : undefined),
          }}
        >
          <p className={cn("truncate font-semibold", dragEstilo.texto)}>
            {new Date(drag.agendamento.data_hora).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            {dragPaciente?.nome ?? "—"}
          </p>
          <p className={cn("truncate opacity-80", dragEstilo.texto)}>
            {dragProcedimento?.nome ?? "Sem procedimento"}
          </p>
        </div>
      )}

      <Sheet
        open={resumoAberto !== null}
        onOpenChange={(open) => {
          if (!open) setResumoAberto(null);
        }}
      >
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {resumoAberto?.length} agendamentos neste horário
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-2 px-4">
            {resumoAberto
              ?.slice()
              .sort(
                (a, b) =>
                  new Date(a.data_hora).getTime() -
                  new Date(b.data_hora).getTime(),
              )
              .map((agendamento) => {
                const paciente = pacientesMap.get(agendamento.paciente_id);
                const profissional = profissionaisMap.get(
                  agendamento.usuario_id,
                );
                const procedimento = agendamento.procedimento_id
                  ? procedimentosMap.get(agendamento.procedimento_id)
                  : undefined;
                return (
                  <AgendamentoCard
                    key={agendamento.id}
                    agendamento={agendamento}
                    paciente={paciente}
                    profissional={profissional}
                    procedimento={procedimento}
                    corProfissional={profissionalCorMap.get(
                      agendamento.usuario_id,
                    )}
                    arrastavel={false}
                    arrastando={false}
                    onDragStart={noop}
                    onDragMove={noop}
                    onDragEnd={noop}
                    variant="lista"
                  />
                );
              })}
          </div>
        </SheetContent>
      </Sheet>

      <AgendamentoFormDialog
        open={slotSelecionado !== null}
        onOpenChange={(open) => {
          if (!open) setSlotSelecionado(null);
        }}
        initialDataHora={slotSelecionado ?? undefined}
        pacientes={pacientes}
        profissionais={profissionais}
        salas={salas}
        procedimentos={procedimentos}
        horarioFuncionamento={horarioFuncionamento}
      />
    </div>
  );
}
