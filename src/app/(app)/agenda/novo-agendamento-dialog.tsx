"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AgendamentoFormDialog } from "./agendamento-form-dialog";
import type {
  HorarioDia,
  Paciente,
  Procedimento,
  Sala,
  Usuario,
} from "@/lib/types/db";

export function NovoAgendamentoDialog({
  pacientes,
  profissionais,
  salas,
  procedimentos,
  horarioFuncionamento,
}: {
  pacientes: Paciente[];
  profissionais: Usuario[];
  salas: Sala[];
  procedimentos: Procedimento[];
  horarioFuncionamento: HorarioDia[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        disabled={pacientes.length === 0 || profissionais.length === 0}
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Novo agendamento
      </Button>
      <AgendamentoFormDialog
        open={open}
        onOpenChange={setOpen}
        pacientes={pacientes}
        profissionais={profissionais}
        salas={salas}
        procedimentos={procedimentos}
        horarioFuncionamento={horarioFuncionamento}
      />
    </>
  );
}
