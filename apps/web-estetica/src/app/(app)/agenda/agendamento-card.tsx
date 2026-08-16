"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarClock,
  CircleCheck,
  CircleX,
  Clock,
  PlayCircle,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { createClient } from "@empresa/supabase/client";
import { cn } from "@empresa/ui/utils";
import { Button } from "@empresa/ui/components/button";
import { Separator } from "@empresa/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@empresa/ui/components/sheet";
import type { Agendamento, Paciente, Procedimento, Usuario } from "@/lib/types/db";
import { iniciaisPaciente } from "@/lib/pacientes-utils";
import { NovoAtendimentoDialog } from "../atendimento/novo-atendimento-dialog";

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
  const [atendimentoDialogOpen, setAtendimentoDialogOpen] = useState(false);

  const podeIniciarAtendimento =
    agendamento.status === "agendado" || agendamento.status === "confirmado";
  const podeConfirmarPresenca = agendamento.status === "agendado";
  const podeMarcarFalta =
    agendamento.status === "agendado" || agendamento.status === "confirmado";
  const podeCancelar =
    agendamento.status === "agendado" || agendamento.status === "confirmado";

  const startRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const justDraggedRef = useRef(false);

  const inicio = new Date(agendamento.data_hora);
  const estilo = STATUS_ESTILO[agendamento.status];

  async function atualizarStatus(
    novoStatus: Agendamento["status"],
    mensagemErro: string,
    mensagemSucesso: string,
  ) {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("agendamentos")
      .update({ status: novoStatus })
      .eq("id", agendamento.id);
    setLoading(false);

    if (error) {
      toast.error(mensagemErro);
      return;
    }

    toast.success(mensagemSucesso);
    setOpen(false);
    router.refresh();
  }

  function cancelar() {
    return atualizarStatus(
      "cancelado",
      "Não foi possível cancelar o agendamento.",
      "Agendamento cancelado.",
    );
  }

  function confirmarPresenca() {
    return atualizarStatus(
      "confirmado",
      "Não foi possível confirmar o agendamento.",
      "Presença confirmada.",
    );
  }

  function marcarFalta() {
    return atualizarStatus(
      "faltou",
      "Não foi possível marcar a falta.",
      "Falta registrada.",
    );
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

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                {iniciaisPaciente(paciente?.nome ?? "—")}
              </span>
              <div className="flex flex-col gap-1">
                <SheetTitle>{paciente?.nome ?? "Paciente"}</SheetTitle>
                <span
                  className={cn(
                    "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    estilo.bg,
                    estilo.texto,
                  )}
                >
                  {STATUS_LABEL[agendamento.status]}
                </span>
              </div>
            </div>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-4">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
              <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">
                {inicio.toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
              <span className="text-muted-foreground">
                · {agendamento.duracao_minutos} min
              </span>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border p-3 text-sm">
              <div className="flex items-start gap-2.5">
                <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    Procedimento
                  </span>
                  <span className="font-medium">
                    {procedimento?.nome ?? "—"}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-2.5">
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    Profissional
                  </span>
                  <span className="font-medium">
                    {profissional?.nome ?? "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="gap-3">
            {(podeConfirmarPresenca || podeIniciarAtendimento) && (
              <div className="flex flex-wrap gap-2">
                {podeConfirmarPresenca && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={confirmarPresenca}
                    className="flex-1"
                  >
                    <CircleCheck className="h-4 w-4" />
                    Confirmar presença
                  </Button>
                )}
                {podeIniciarAtendimento && (
                  <Button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setAtendimentoDialogOpen(true);
                    }}
                    className="flex-1"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Iniciar atendimento
                  </Button>
                )}
              </div>
            )}

            {(podeMarcarFalta || podeCancelar) && (
              <div className="flex flex-wrap gap-2 border-t pt-3">
                {podeMarcarFalta && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={loading}
                    onClick={marcarFalta}
                    className="text-muted-foreground"
                  >
                    <Clock className="h-4 w-4" />
                    Marcar falta
                  </Button>
                )}
                {podeCancelar && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={loading}
                    onClick={cancelar}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <CircleX className="h-4 w-4" />
                    {loading ? "Cancelando..." : "Cancelar agendamento"}
                  </Button>
                )}
              </div>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {podeIniciarAtendimento && (
        <NovoAtendimentoDialog
          open={atendimentoDialogOpen}
          onOpenChange={setAtendimentoDialogOpen}
          agendamento={{
            id: agendamento.id,
            pacienteId: agendamento.paciente_id,
            profissionalId: agendamento.usuario_id,
            procedimentoId: agendamento.procedimento_id,
            pacienteNome: paciente?.nome,
            profissionalNome: profissional?.nome,
            procedimentoNome: procedimento?.nome,
          }}
        />
      )}
    </>
  );
}
