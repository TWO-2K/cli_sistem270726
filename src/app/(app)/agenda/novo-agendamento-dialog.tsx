"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Paciente, Procedimento, Profissional, Sala } from "@/lib/types/db";

function toDatetimeLocal(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function NovoAgendamentoDialog({
  pacientes,
  profissionais,
  salas,
  procedimentos,
}: {
  pacientes: Paciente[];
  profissionais: Profissional[];
  salas: Sala[];
  procedimentos: Procedimento[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pacienteId, setPacienteId] = useState("");
  const [profissionalId, setProfissionalId] = useState("");
  const [salaId, setSalaId] = useState("");
  const [procedimentoId, setProcedimentoId] = useState("");
  const [dataHora, setDataHora] = useState(toDatetimeLocal(new Date()));

  const podeSubmeter = pacienteId && profissionalId && dataHora;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!podeSubmeter) return;
    setLoading(true);

    const procedimento = procedimentos.find((p) => p.id === procedimentoId);
    const supabase = createClient();
    const { error } = await supabase.from("agendamentos").insert({
      paciente_id: pacienteId,
      profissional_id: profissionalId,
      sala_id: salaId || null,
      procedimento_id: procedimentoId || null,
      data_hora: new Date(dataHora).toISOString(),
      duracao_minutos: procedimento?.duracao_minutos ?? 30,
    });

    setLoading(false);

    if (error) {
      toast.error("Não foi possível criar o agendamento.");
      return;
    }

    toast.success("Agendamento criado.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button disabled={pacientes.length === 0 || profissionais.length === 0} />
        }
      >
        <Plus className="h-4 w-4" />
        Novo agendamento
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}
