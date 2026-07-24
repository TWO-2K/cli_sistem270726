"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
import type { Paciente, Procedimento, Usuario } from "@/lib/types/db";

export function NovoAtendimentoDialog({
  pacientes,
  profissionais,
  procedimentos,
}: {
  pacientes: Paciente[];
  profissionais: Usuario[];
  procedimentos: Procedimento[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pacienteId, setPacienteId] = useState("");
  const [profissionalId, setProfissionalId] = useState("");
  const [procedimentoId, setProcedimentoId] = useState("");

  const podeSubmeter = pacienteId && profissionalId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!podeSubmeter) return;
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.from("atendimentos").insert({
      paciente_id: pacienteId,
      usuario_id: profissionalId,
      procedimento_id: procedimentoId || null,
    });

    setLoading(false);

    if (error) {
      toast.error("Não foi possível iniciar o atendimento.");
      return;
    }

    toast.success("Atendimento iniciado.");
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
        Iniciar atendimento
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Iniciar atendimento</DialogTitle>
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
