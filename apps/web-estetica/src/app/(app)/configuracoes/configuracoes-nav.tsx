"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@empresa/ui/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@empresa/ui/components/select";

type ConfiguracoesItem = {
  value: string;
  label: string;
  content: ReactNode;
};

type ConfiguracoesGrupo = {
  label: string;
  itens: ConfiguracoesItem[];
};

export function ConfiguracoesNav({
  grupos,
  defaultValue,
}: {
  grupos: ConfiguracoesGrupo[];
  defaultValue: string;
}) {
  const [ativo, setAtivo] = useState(defaultValue);
  const itemAtivo = grupos
    .flatMap((grupo) => grupo.itens)
    .find((item) => item.value === ativo);

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <div className="md:hidden">
        <Select
          value={ativo}
          onValueChange={(value) => {
            if (value) setAtivo(value);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {grupos.map((grupo) => (
              <div key={grupo.label}>
                <div className="px-2 py-1.5 text-xs font-medium uppercase text-muted-foreground">
                  {grupo.label}
                </div>
                {grupo.itens.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav className="hidden w-56 shrink-0 flex-col gap-4 md:flex">
        {grupos.map((grupo) => (
          <div key={grupo.label} className="flex flex-col gap-1">
            <span className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {grupo.label}
            </span>
            {grupo.itens.map((item) => {
              const active = item.value === ativo;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setAtivo(item.value)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="min-w-0 flex-1">{itemAtivo?.content}</div>
    </div>
  );
}
