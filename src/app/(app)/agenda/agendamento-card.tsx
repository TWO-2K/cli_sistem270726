"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Agendamento, Paciente, Profissional } from "@/lib/types/db";

const STATUS_ESTILO: Record<
  Agendamento["status"],
  { bg: string; barra: string; extra?: string }
> = {
  agendado: { bg: "bg-primary/10", barra: "bg-primary" },
  confirmado: { bg: "bg-primary/15", barra: "bg-primary" },
  em_atendimento: { bg: "bg-chart-4/15", barra: "bg-chart-4" },
  concluido: { bg: "bg-muted", barra: "bg-muted-foreground/40" },
  cancelado: {
    bg: "bg-destructive/10",
    barra: "bg-destructive/50",
    extra: "opacity-60 line-through",
  },
  faltou: {
    bg: "bg-destructive/10",
    barra: "bg-destructive/50",
    extra: "opacity-60",
  },
};

const STATUS_LABEL: Record<Agendamento["status"], string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
  faltou: "Faltou",
};

export function AgendamentoCard({
  agendamento,
  paciente,
  profissional,
  style,
}: {
  agendamento: Agendamento;
  paciente: Paciente | undefined;
  profissional: Profissional | undefined;
  style: React.CSSProperties;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const inicio = new Date(agendamento.data_hora);
  const estilo = STATUS_ESTILO[agendamento.status];

  async function cancelar() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("agendamentos")
      .update({ status: "cancelado" })
      .eq("id", agendamento.id);
    setLoading(false);

    if (error) {
      toast.error("Não foi possível cancelar o agendamento.");
      return;
    }

    toast.success("Agendamento cancelado.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`${paciente?.nome ?? "Paciente"} · ${profissional?.nome ?? ""}`}
        className={cn(
          "absolute cursor-pointer overflow-hidden rounded-md py-1 pr-1.5 pl-2.5 text-left text-xs shadow-sm transition hover:z-10 hover:shadow-md",
          estilo.bg,
          estilo.extra,
        )}
        style={style}
      >
        <span className={cn("absolute inset-y-0 left-0 w-1", estilo.barra)} />
        <p className="truncate font-semibold text-foreground">
          {inicio.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          {paciente?.nome ?? "—"}
        </p>
        <p className="truncate text-muted-foreground">
          {profissional?.nome ?? "—"}
        </p>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do agendamento</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1 text-sm">
            <p>
              <span className="text-muted-foreground">Paciente: </span>
              {paciente?.nome ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Profissional: </span>
              {profissional?.nome ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Data e hora: </span>
              {inicio.toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
            <p>
              <span className="text-muted-foreground">Duração: </span>
              {agendamento.duracao_minutos} min
            </p>
            <p>
              <span className="text-muted-foreground">Status: </span>
              {STATUS_LABEL[agendamento.status]}
            </p>
          </div>
          <DialogFooter>
            {agendamento.status !== "cancelado" && (
              <Button
                type="button"
                variant="destructive"
                disabled={loading}
                onClick={cancelar}
              >
                {loading ? "Cancelando..." : "Cancelar agendamento"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
