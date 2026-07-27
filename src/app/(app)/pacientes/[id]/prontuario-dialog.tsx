"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ProntuarioDialog({
  pacienteId,
  temProntuario,
}: {
  pacienteId: string;
  temProntuario: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAbrirProntuario() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("prontuarios")
      .upsert({ paciente_id: pacienteId }, { onConflict: "paciente_id" });
    setLoading(false);

    if (error) {
      toast.error("Não foi possível abrir o prontuário.");
      return;
    }

    toast.success("Prontuário aberto.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        {temProntuario ? "Prontuário aberto" : "Abrir prontuário"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Prontuário</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          O prontuário deste paciente reúne o histórico de atendimentos,
          evoluções, fotos e anamneses já registrados abaixo. Não é
          necessário preencher nada aqui — apenas confirme para abrir o
          prontuário do paciente.
        </p>
        <DialogFooter>
          <Button onClick={handleAbrirProntuario} disabled={loading}>
            {loading ? "Salvando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
