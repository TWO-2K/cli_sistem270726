"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@empresa/supabase/client";
import { Button } from "@empresa/ui/components/button";
import { Input } from "@empresa/ui/components/input";
import { Label } from "@empresa/ui/components/label";
import { Textarea } from "@empresa/ui/components/textarea";
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
import { Plus } from "lucide-react";
import type { Paciente, PeriodoDia, Procedimento, Usuario } from "@/lib/types/db";

const QUALQUER = "qualquer";

const PERIODO_LABELS: Record<PeriodoDia, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
  qualquer: "Qualquer período",
};

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function daquiA30DiasISO() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export function ListaEsperaFormDialog({
  pacientes,
  usuarios,
  procedimentos,
}: {
  pacientes: Paciente[];
  usuarios: Usuario[];
  procedimentos: Procedimento[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pacienteId, setPacienteId] = useState("");
  const [profissionalId, setProfissionalId] = useState(QUALQUER);
  const [procedimentoId, setProcedimentoId] = useState(QUALQUER);
  const [disponibilidadeInicio, setDisponibilidadeInicio] = useState(hojeISO());
  const [disponibilidadeFim, setDisponibilidadeFim] = useState(daquiA30DiasISO());
  const [periodoDia, setPeriodoDia] = useState<PeriodoDia>("qualquer");
  const [observacoes, setObservacoes] = useState("");

  function resetar() {
    setPacienteId("");
    setProfissionalId(QUALQUER);
    setProcedimentoId(QUALQUER);
    setDisponibilidadeInicio(hojeISO());
    setDisponibilidadeFim(daquiA30DiasISO());
    setPeriodoDia("qualquer");
    setObservacoes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.from("lista_espera").insert({
      paciente_id: pacienteId,
      profissional_id: profissionalId === QUALQUER ? null : profissionalId,
      procedimento_id: procedimentoId === QUALQUER ? null : procedimentoId,
      disponibilidade_inicio: disponibilidadeInicio,
      disponibilidade_fim: disponibilidadeFim,
      periodo_dia: periodoDia,
      observacoes: observacoes || null,
    });

    setLoading(false);

    if (error) {
      toast.error("Não foi possível adicionar à lista de espera.");
      return;
    }

    toast.success("Paciente adicionado à lista de espera.");
    resetar();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        Adicionar à lista
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar à lista de espera</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Paciente</Label>
            <Select value={pacienteId} onValueChange={(v) => setPacienteId(v ?? "")}>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Profissional desejado</Label>
              <Select value={profissionalId} onValueChange={(v) => setProfissionalId(v ?? QUALQUER)}>
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer">
                    {(value: string) =>
                      value === QUALQUER
                        ? "Qualquer"
                        : (usuarios.find((u) => u.id === value)?.nome ?? "Qualquer")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={QUALQUER}>Qualquer</SelectItem>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Procedimento desejado</Label>
              <Select value={procedimentoId} onValueChange={(v) => setProcedimentoId(v ?? QUALQUER)}>
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer">
                    {(value: string) =>
                      value === QUALQUER
                        ? "Qualquer"
                        : (procedimentos.find((p) => p.id === value)?.nome ?? "Qualquer")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={QUALQUER}>Qualquer</SelectItem>
                  {procedimentos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="lista-espera-inicio">Disponível a partir de</Label>
              <Input
                id="lista-espera-inicio"
                type="date"
                required
                value={disponibilidadeInicio}
                onChange={(e) => setDisponibilidadeInicio(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lista-espera-fim">Até</Label>
              <Input
                id="lista-espera-fim"
                type="date"
                required
                value={disponibilidadeFim}
                onChange={(e) => setDisponibilidadeFim(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Período</Label>
              <Select
                value={periodoDia}
                onValueChange={(v) => setPeriodoDia((v as PeriodoDia) ?? "qualquer")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PERIODO_LABELS) as PeriodoDia[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PERIODO_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lista-espera-observacoes">Observações</Label>
            <Textarea
              id="lista-espera-observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !pacienteId}>
              {loading ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
