"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
      return;
    }
    if (!horaDentroDoExpediente(horarioDia, inicio.getHours())) {
      toast.error(
        `Horário fora do funcionamento da clínica (${horarioDia.inicio} às ${horarioDia.fim}).`,
      );
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
      </div>
      <div className="flex flex-col gap-2">
        <Label>Profissional</Label>
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
      </div>
      <div className="flex flex-col gap-2">
        <Label>Procedimento</Label>
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
      </div>
      <div className="flex flex-col gap-2">
        <Label>Sala</Label>
        <Select value={salaId} onValueChange={(value) => setSalaId(value ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Opcional" />
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
