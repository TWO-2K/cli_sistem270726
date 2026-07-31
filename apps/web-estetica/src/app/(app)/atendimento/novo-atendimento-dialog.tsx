"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@empresa/supabase/client";
import { Button } from "@empresa/ui/components/button";
import { Label } from "@empresa/ui/components/label";
import { ClipboardCheck, Plus, TriangleAlert } from "lucide-react";
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
  const [anamneseId, setAnamneseId] = useState<string | null>(null);
  const [anamneseData, setAnamneseData] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!pacienteId) {
        setContraindicados(new Set());
        setAnamneseId(null);
        setAnamneseData(null);
        return;
      }
      const supabase = createClient();
      const { data: anamnese } = await supabase
        .from("anamneses")
        .select("id, criado_em")
        .eq("paciente_id", pacienteId)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string; criado_em: string }>();
      if (!anamnese) {
        if (!cancelado) {
          setContraindicados(new Set());
          setAnamneseId(null);
          setAnamneseData(null);
        }
        return;
      }
      if (!cancelado) {
        setAnamneseId(anamnese.id);
        setAnamneseData(anamnese.criado_em);
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
      anamnese_id: anamneseId,
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
                  <SelectValue placeholder="Selecione o paciente">
                    {(value: string) =>
                      pacientes.find((p) => p.id === value)?.nome ?? "Selecione o paciente"
                    }
                  </SelectValue>
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
            {pacienteId && anamneseId && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ClipboardCheck className="h-3.5 w-3.5 shrink-0" />
                Anamnese de{" "}
                {anamneseData
                  ? new Date(anamneseData).toLocaleDateString("pt-BR")
                  : "—"}{" "}
                será vinculada automaticamente a este atendimento.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Profissional</Label>
            {vinculado ? (
              <p className="text-sm">{agendamento?.profissionalNome ?? "—"}</p>
            ) : (
              <Select value={profissionalId} onValueChange={(value) => setProfissionalId(value ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o profissional">
                    {(value: string) =>
                      profissionais.find((p) => p.id === value)?.nome ?? "Selecione o profissional"
                    }
                  </SelectValue>
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
                  <SelectValue placeholder="Opcional">
                    {(value: string) =>
                      procedimentos.find((p) => p.id === value)?.nome ?? "Opcional"
                    }
                  </SelectValue>
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
                  <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      <span className="font-medium">Atenção: </span>
                      este procedimento está marcado como contraindicado na
                      anamnese do paciente. O atendimento pode ser iniciado
                      mesmo assim, mas confirme antes de prosseguir.
                    </p>
                  </div>
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
