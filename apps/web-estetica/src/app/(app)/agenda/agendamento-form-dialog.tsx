"use client";

import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@empresa/supabase/client";
import { Input } from "@empresa/ui/components/input";
import { Label } from "@empresa/ui/components/label";
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
} from "@empresa/ui/components/dialog";
import { Button } from "@empresa/ui/components/button";
import type {
  Agendamento,
  HorarioDia,
  Paciente,
  Procedimento,
  Sala,
  Usuario,
} from "@/lib/types/db";
import { horaDentroDoExpediente, horarioDoDia } from "./agenda-utils";

function toDatetimeLocal(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function AgendamentoForm({
  initialDataHora,
  pacientes,
  profissionais,
  salas,
  procedimentos,
  horarioFuncionamento,
  onSuccess,
}: {
  initialDataHora?: Date;
  pacientes: Paciente[];
  profissionais: Usuario[];
  salas: Sala[];
  procedimentos: Procedimento[];
  horarioFuncionamento: HorarioDia[];
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pacienteId, setPacienteId] = useState("");
  const [profissionalId, setProfissionalId] = useState("");
  const [salaId, setSalaId] = useState("");
  const [procedimentoId, setProcedimentoId] = useState("");
  const [dataHora, setDataHora] = useState(() =>
    toDatetimeLocal(initialDataHora ?? new Date()),
  );
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

  const podeSubmeter = pacienteId && profissionalId && dataHora;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!podeSubmeter) return;
    setLoading(true);

    const procedimento = procedimentos.find((p) => p.id === procedimentoId);
    const duracaoMinutos = procedimento?.duracao_minutos ?? 30;
    const inicio = new Date(dataHora);
    const fim = new Date(inicio.getTime() + duracaoMinutos * 60_000);

    const horarioDia = horarioDoDia(horarioFuncionamento, inicio);
    if (!horarioDia?.ativo) {
      toast.error("A clínica não funciona neste dia.");
      setLoading(false);
      return;
    }
    if (!horaDentroDoExpediente(horarioDia, inicio.getHours())) {
      toast.error(
        `Horário fora do funcionamento da clínica (${horarioDia.inicio} às ${horarioDia.fim}).`,
      );
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const { data: possiveisConflitos } = await supabase
      .from("agendamentos")
      .select("paciente_id, usuario_id, data_hora, duracao_minutos, status")
      .or(`paciente_id.eq.${pacienteId},usuario_id.eq.${profissionalId}`)
      .not("status", "in", "(cancelado,faltou)")
      .returns<
        Pick<
          Agendamento,
          "paciente_id" | "usuario_id" | "data_hora" | "duracao_minutos" | "status"
        >[]
      >();

    const conflito = (possiveisConflitos ?? []).find((c) => {
      const cInicio = new Date(c.data_hora);
      const cFim = new Date(cInicio.getTime() + c.duracao_minutos * 60_000);
      const sobrepoe = inicio < cFim && fim > cInicio;
      if (!sobrepoe) return false;
      return c.usuario_id === profissionalId || c.paciente_id === pacienteId;
    });

    if (conflito) {
      setLoading(false);
      toast.error(
        conflito.usuario_id === profissionalId
          ? "Este profissional já tem um agendamento nesse horário."
          : "Este paciente já tem um agendamento nesse horário.",
      );
      return;
    }

    const { error } = await supabase.from("agendamentos").insert({
      paciente_id: pacienteId,
      usuario_id: profissionalId,
      sala_id: salaId || null,
      procedimento_id: procedimentoId || null,
      data_hora: inicio.toISOString(),
      duracao_minutos: duracaoMinutos,
    });

    setLoading(false);

    if (error) {
      if (error.code === "23P01") {
        toast.error(
          "Já existe um agendamento nesse horário para o profissional ou paciente selecionado.",
        );
      } else {
        toast.error("Não foi possível criar o agendamento.");
      }
      return;
    }

    toast.success("Agendamento criado.");
    router.refresh();
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Paciente</Label>
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
      </div>
      <div className="flex flex-col gap-2">
        <Label>Profissional</Label>
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
      </div>
      <div className="flex flex-col gap-2">
        <Label>Procedimento</Label>
        <Select value={procedimentoId} onValueChange={(value) => setProcedimentoId(value ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Opcional">
              {(value: string) => procedimentos.find((p) => p.id === value)?.nome ?? "Opcional"}
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
        {procedimentoId && contraindicados.has(procedimentoId) && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <span className="font-medium">Atenção: </span>
              este procedimento está marcado como contraindicado na anamnese
              do paciente. O agendamento pode ser criado mesmo assim, mas
              confirme com o profissional responsável.
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label>Sala</Label>
        <Select value={salaId} onValueChange={(value) => setSalaId(value ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Opcional">
              {(value: string) => salas.find((s) => s.id === value)?.nome ?? "Opcional"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {salas.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="dataHora">Data e hora</Label>
        <Input
          id="dataHora"
          type="datetime-local"
          required
          value={dataHora}
          onChange={(e) => setDataHora(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={loading || !podeSubmeter}>
          {loading ? "Salvando..." : "Agendar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AgendamentoFormDialog({
  open,
  onOpenChange,
  initialDataHora,
  pacientes,
  profissionais,
  salas,
  procedimentos,
  horarioFuncionamento,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDataHora?: Date;
  pacientes: Paciente[];
  profissionais: Usuario[];
  salas: Sala[];
  procedimentos: Procedimento[];
  horarioFuncionamento: HorarioDia[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
        </DialogHeader>
        {open && (
          <AgendamentoForm
            key={initialDataHora?.getTime() ?? "default"}
            initialDataHora={initialDataHora}
            pacientes={pacientes}
            profissionais={profissionais}
            salas={salas}
            procedimentos={procedimentos}
            horarioFuncionamento={horarioFuncionamento}
            onSuccess={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
