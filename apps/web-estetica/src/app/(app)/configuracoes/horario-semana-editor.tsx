"use client";

import { Input } from "@empresa/ui/components/input";
import { cn } from "@empresa/ui/utils";
import type { HorarioDia } from "@/lib/types/db";

export const DIAS_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function HorarioSemanaEditor({
  horarios,
  onChange,
}: {
  horarios: HorarioDia[];
  onChange: (horarios: HorarioDia[]) => void;
}) {
  function atualizarDia(index: number, patch: Partial<HorarioDia>) {
    onChange(horarios.map((h, i) => (i === index ? { ...h, ...patch } : h)));
  }

  return (
    <div className="rounded-lg border bg-card">
      {horarios.map((h, i) => (
        <div
          key={i}
          className={cn(
            "flex flex-col gap-2 border-b p-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between",
            !h.ativo && "opacity-60",
          )}
        >
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={h.ativo}
              onChange={(e) => atualizarDia(i, { ativo: e.target.checked })}
            />
            {DIAS_SEMANA[i]}
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="time"
              disabled={!h.ativo}
              value={h.inicio}
              onChange={(e) => atualizarDia(i, { inicio: e.target.value })}
              className="w-28 shrink"
            />
            <span className="text-sm text-muted-foreground">até</span>
            <Input
              type="time"
              disabled={!h.ativo}
              value={h.fim}
              onChange={(e) => atualizarDia(i, { fim: e.target.value })}
              className="w-28 shrink"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
