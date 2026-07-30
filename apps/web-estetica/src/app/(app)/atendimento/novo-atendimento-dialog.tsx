"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@empresa/supabase/client";
import { Button } from "@empresa/ui/components/button";
import { Label } from "@empresa/ui/components/label";
import { Plus, TriangleAlert } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@empresa/ui/components/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@empresa/ui/components/dialog";
import type { Paciente, Procedimento, Usuario } from "@/lib/types/db";

export interface AgendamentoOrigem {
  id: string;
  pacienteId: string;
  profissionalId: string;
  procedimentoId: string | null;
  pacienteNome?: string;
  profissionalNome?: string;
  procedimentoNome?: string;
}

export function NovoAtendimentoDialog({
  pacientes = [],
  profissionais = [],
  procedimentos = [],
  agendamento,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  pacientes?: Paciente[];
  profissionais?: Usuario[];
  procedimentos?: Procedimento[];
  agendamento?: AgendamentoOrigem;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChangeProp ?? setOpenState;
  const [loading, setLoading] = useState(false);
  const [pacienteId, setPacienteId] = useState(agendamento?.pacienteId ?? "");
  const [profissionalId, setProfissionalId] = useState(agendamento?.profissionalId ?? "");
  const [procedimentoId, setProcedimentoId] = useState(agendamento?.procedimentoId ?? "");

  const vinculado = Boolean(agendamento);
  const podeSubmeter = pacienteId && profissionalId;
  const [contraindicados, setContraindicados] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!pacienteId) {
        setContraindicados(new Set());
        return;
      }
      const supabase = createClient();
      const { data: anamnese } = await supabase
        .from("anamneses")
        .select("id")
        .eq("paciente_id", pacienteId)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string }>();
      if (!anamnese) {
        if (!cancelado) setContraindicados(new Set());
        return;
      }
      const { data } = await supabase
        .schema("estetica")
        .from("anamnese_estetica_contraindicacao")
        .select("procedimento_id")
        .eq("anamnese_id", anamnese.id)
        .returns<{ procedimento_id: string }[]>();
      if (!cancelado) {
        setContraindicados(new Set((data ?? []).map((d) => d.procedimento_id)));
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [pacienteId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!podeSubmeter) return;
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.from("atendimentos").insert({
      paciente_id: pacienteId,
      usuario_id: profissionalId,
      procedimento_id: procedimentoId || null,
      agendamento_id: agendamento?.id ?? null,
    });

    if (error) {
      setLoading(false);
      toast.error("Não foi possível iniciar o atendimento.");
      return;
    }

    if (agendamento) {
      await supabase
        .from("agendamentos")
        .update({ status: "em_atendimento" })
        .eq("id", agendamento.id);
    }

    setLoading(false);
    toast.success("Atendimento iniciado.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!vinculado && (
        <DialogTrigger
          render={
            <Button disabled={pacientes.length === 0 || profissionais.length === 0} />
          }
        >
          <Plus className="h-4 w-4" />
          Iniciar atendimento
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Iniciar atendimento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Paciente</Label>
            {vinculado ? (
              <p className="text-sm">{agendamento?.pacienteNome ?? "—"}</p>
            ) : (
              <Select value={pacienteId} onValueChange={(value) => setPacienteId(value ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {pacientes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Profissional</Label>
            {vinculado ? (
              <p className="text-sm">{agendamento?.profissionalNome ?? "—"}</p>
            ) : (
              <Select value={profissionalId} onValueChange={(value) => setProfissionalId(value ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent>
                  {profissionais.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Procedimento</Label>
            {vinculado ? (
              <p className="text-sm">{agendamento?.procedimentoNome ?? "—"}</p>
            ) : (
              <Select value={procedimentoId} onValueChange={(value) => setProcedimentoId(value ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {procedimentos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {(() => {
              const procedimentoAtivo = vinculado
                ? agendamento?.procedimentoId
                : procedimentoId;
              return (
                procedimentoAtivo &&
                contraindicados.has(procedimentoAtivo) && (
                  <p className="flex items-center gap-1.5 text-sm text-destructive">
                    <TriangleAlert className="h-4 w-4 shrink-0" />
                    Este procedimento está marcado como contraindicado na
                    anamnese do paciente.
                  </p>
                )
              );
            })()}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !podeSubmeter}>
              {loading ? "Salvando..." : "Iniciar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
