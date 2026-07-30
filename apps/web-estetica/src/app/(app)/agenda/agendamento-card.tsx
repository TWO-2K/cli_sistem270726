"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@clinica/supabase/client";
import { cn } from "@clinica/ui/utils";
import { Button } from "@clinica/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@clinica/ui/components/dialog";
import type { Agendamento, Paciente, Procedimento, Usuario } from "@/lib/types/db";

export const STATUS_ESTILO: Record<
  Agendamento["status"],
  { bg: string; borda: string; texto: string; extra?: string }
> = {
  agendado: {
    bg: "bg-primary/10",
    borda: "border-primary/30",
    texto: "text-primary",
  },
  confirmado: {
    bg: "bg-primary/15",
    borda: "border-primary/40",
    texto: "text-primary",
  },
  em_atendimento: {
    bg: "bg-chart-4/15",
    borda: "border-chart-4/40",
    texto: "text-chart-4",
  },
  concluido: {
    bg: "bg-muted",
    borda: "border-muted-foreground/30",
    texto: "text-muted-foreground",
  },
  cancelado: {
    bg: "bg-destructive/10",
    borda: "border-destructive/30",
    texto: "text-destructive",
    extra: "opacity-60 line-through",
  },
  faltou: {
    bg: "bg-destructive/10",
    borda: "border-destructive/30",
    texto: "text-destructive",
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

export const STATUS_ARRASTAVEIS: Agendamento["status"][] = [
  "agendado",
  "confirmado",
  "em_atendimento",
];

const LIMIAR_ARRASTO_PX = 6;

export interface DragStartInfo {
  pointerOffsetX: number;
  pointerOffsetY: number;
  widthPx: number;
  heightPx: number;
  clientX: number;
  clientY: number;
}

export function AgendamentoCard({
  agendamento,
  paciente,
  profissional,
  procedimento,
  corProfissional,
  style,
  arrastavel,
  arrastando,
  onDragStart,
  onDragMove,
  onDragEnd,
  variant = "grade",
}: {
  agendamento: Agendamento;
  paciente: Paciente | undefined;
  profissional: Usuario | undefined;
  procedimento: Procedimento | undefined;
  corProfissional?: string;
  style?: React.CSSProperties;
  arrastavel: boolean;
  arrastando: boolean;
  onDragStart: (agendamento: Agendamento, info: DragStartInfo) => void;
  onDragMove: (clientX: number, clientY: number) => void;
  onDragEnd: (clientX: number, clientY: number) => void;
  variant?: "grade" | "lista";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const startRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const justDraggedRef = useRef(false);

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

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (!arrastavel) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    draggingRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!arrastavel || !startRef.current) return;

    if (!draggingRef.current) {
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      if (Math.hypot(dx, dy) < LIMIAR_ARRASTO_PX) return;

      draggingRef.current = true;
      const rect = e.currentTarget.getBoundingClientRect();
      onDragStart(agendamento, {
        pointerOffsetX: startRef.current.x - rect.left,
        pointerOffsetY: startRef.current.y - rect.top,
        widthPx: rect.width,
        heightPx: rect.height,
        clientX: e.clientX,
        clientY: e.clientY,
      });
      return;
    }

    onDragMove(e.clientX, e.clientY);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!arrastavel) return;
    if (draggingRef.current) {
      onDragEnd(e.clientX, e.clientY);
      justDraggedRef.current = true;
    }
    startRef.current = null;
    draggingRef.current = false;
  }

  function handleClick() {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={variant === "lista" ? () => setOpen(true) : handleClick}
        onPointerDown={variant === "grade" ? handlePointerDown : undefined}
        onPointerMove={variant === "grade" ? handlePointerMove : undefined}
        onPointerUp={variant === "grade" ? handlePointerUp : undefined}
        title={`${paciente?.nome ?? "Paciente"} · ${profissional?.nome ?? ""}`}
        className={cn(
          "box-border overflow-hidden rounded-md border-y border-r text-left shadow-sm transition hover:shadow-md",
          corProfissional ? "border-l-4" : "border-l",
          variant === "grade"
            ? "absolute px-2 py-1 text-xs hover:z-10"
            : "w-full px-3 py-2 text-sm",
          variant === "grade" &&
            (arrastavel ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"),
          arrastando && "opacity-0",
          estilo.bg,
          estilo.borda,
          estilo.extra,
        )}
        style={{
          ...(variant === "grade" ? style : undefined),
          ...(variant === "grade" && arrastavel ? { touchAction: "none" } : undefined),
          ...(corProfissional ? { borderLeftColor: corProfissional } : undefined),
        }}
      >
        <p className={cn("truncate font-semibold", estilo.texto)}>
          {inicio.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          {paciente?.nome ?? "—"}
        </p>
        <p className={cn("truncate opacity-80", estilo.texto)}>
          {procedimento?.nome ?? "Sem procedimento"}
          {variant === "lista" && ` · ${profissional?.nome ?? "—"}`}
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
              <span className="text-muted-foreground">Procedimento: </span>
              {procedimento?.nome ?? "—"}
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
