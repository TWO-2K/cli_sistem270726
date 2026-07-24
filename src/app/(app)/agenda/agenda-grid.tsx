"use client";

import { useState } from "react";
import type {
  Agendamento,
  HorarioDia,
  Paciente,
  Procedimento,
  Sala,
  Usuario,
} from "@/lib/types/db";
import { cn } from "@/lib/utils";
import { AgendamentoCard } from "./agendamento-card";
import { AgendamentoFormDialog } from "./agendamento-form-dialog";
import {
  DIAS_SEMANA,
  HORA_ALTURA_PX,
  ehMesmoDia,
  horarioDoDia,
  horaDentroDoExpediente,
  layoutEventosDoDia,
  limitesGrid,
} from "./agenda-utils";

function horaLabel(hora: number) {
  return `${String(hora).padStart(2, "0")}:00`;
}

export function AgendaGrid({
  dias,
  agendamentosPorDia,
  pacientesMap,
  profissionaisMap,
  hoje,
  agora,
  pacientes,
  profissionais,
  salas,
  procedimentos,
  horarioFuncionamento,
}: {
  dias: Date[];
  agendamentosPorDia: Map<number, Agendamento[]>;
  pacientesMap: Map<string, Paciente>;
  profissionaisMap: Map<string, Usuario>;
  hoje: Date;
  agora: Date;
  pacientes: Paciente[];
  profissionais: Usuario[];
  salas: Sala[];
  procedimentos: Procedimento[];
  horarioFuncionamento: HorarioDia[];
}) {
  const [slotSelecionado, setSlotSelecionado] = useState<Date | null>(null);

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
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const mostrarLinhaAgora =
    minutosAgora >= minutosGridInicio &&
    minutosAgora <= gridFimHora * 60;

  function abrirNovoAgendamento(dia: Date, hora: number) {
    const data = new Date(dia);
    data.setHours(hora, 0, 0, 0);
    setSlotSelecionado(data);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          className="relative grid"
          style={{ gridTemplateColumns: `64px repeat(${dias.length}, 1fr)` }}
        >
          <div className="sticky top-0 z-20 border-r border-b bg-background" />
          {dias.map((dia, i) => {
            const ehHoje = ehMesmoDia(dia, hoje);
            const diaFechado = !horarioDoDia(horarioFuncionamento, dia)?.ativo;
            return (
              <div
                key={i}
                className={cn(
                  "sticky top-0 z-20 flex flex-col items-center gap-0.5 border-r border-b bg-background p-2 last:border-r-0",
                  ehHoje && "bg-accent/40",
                )}
              >
                <span className="text-xs font-medium text-muted-foreground capitalize">
                  {DIAS_SEMANA[dia.getDay()]}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    ehHoje && "text-primary",
                  )}
                >
                  {String(dia.getDate()).padStart(2, "0")}/
                  {String(dia.getMonth() + 1).padStart(2, "0")}
                </span>
                {diaFechado && (
                  <span className="text-[10px] uppercase text-muted-foreground/70">
                    Fechado
                  </span>
                )}
              </div>
            );
          })}

          <div className="relative border-r pt-3">
            {horas.map((hora) => (
              <div
                key={hora}
                className="flex items-start justify-end border-b pr-2 text-xs text-muted-foreground"
                style={{ height: HORA_ALTURA_PX }}
              >
                <span className="-translate-y-1/2">{horaLabel(hora)}</span>
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
                className={cn(
                  "relative border-r pt-3 last:border-r-0",
                  ehHoje && "bg-accent/20",
                  diaFechado && "bg-muted/30",
                )}
                style={{ height: alturaTotal + 12 }}
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

                {layout.map(({ agendamento, col, cols }) => {
                  const inicio = new Date(agendamento.data_hora);
                  const minutosInicio =
                    inicio.getHours() * 60 + inicio.getMinutes();
                  const top =
                    ((minutosInicio - minutosGridInicio) / 60) *
                    HORA_ALTURA_PX;
                  const altura = Math.max(
                    (agendamento.duracao_minutos / 60) * HORA_ALTURA_PX,
                    20,
                  );
                  const largura = 100 / cols;
                  const paciente = pacientesMap.get(agendamento.paciente_id);
                  const profissional = profissionaisMap.get(
                    agendamento.usuario_id,
                  );

                  return (
                    <AgendamentoCard
                      key={agendamento.id}
                      agendamento={agendamento}
                      paciente={paciente}
                      profissional={profissional}
                      style={{
                        top,
                        height: altura,
                        left: `calc(${largura * col}% + 2px)`,
                        width: `calc(${largura}% - 4px)`,
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

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
