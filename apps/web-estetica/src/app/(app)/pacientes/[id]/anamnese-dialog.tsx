"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@clinica/supabase/client";
import { Button } from "@clinica/ui/components/button";
import { Label } from "@clinica/ui/components/label";
import { Textarea } from "@clinica/ui/components/textarea";
import type { AnamneseRespostas } from "@/lib/types/db";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@clinica/ui/components/dialog";

const CAMPOS: { chave: keyof AnamneseRespostas; label: string; placeholder?: string }[] = [
  { chave: "queixa_principal", label: "Queixa principal" },
  { chave: "historico_saude", label: "Histórico de saúde relevante" },
  { chave: "alergias", label: "Alergias", placeholder: "Nenhuma conhecida" },
  { chave: "medicacoes_em_uso", label: "Medicações em uso" },
  {
    chave: "procedimentos_anteriores",
    label: "Procedimentos estéticos anteriores",
  },
];

const RESPOSTAS_VAZIAS: AnamneseRespostas = {
  queixa_principal: "",
  historico_saude: "",
  alergias: "",
  medicacoes_em_uso: "",
  procedimentos_anteriores: "",
};

export function NovaAnamneseDialog({ pacienteId }: { pacienteId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [respostas, setRespostas] =
    useState<AnamneseRespostas>(RESPOSTAS_VAZIAS);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("anamneses").insert({
      paciente_id: pacienteId,
      respostas,
    });
    setLoading(false);

    if (error) {
      toast.error("Não foi possível registrar a anamnese.");
      return;
    }

    toast.success("Anamnese registrada.");
    setRespostas(RESPOSTAS_VAZIAS);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Nova anamnese
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova anamnese</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {CAMPOS.map((campo) => (
            <div key={campo.chave} className="flex flex-col gap-2">
              <Label htmlFor={campo.chave}>{campo.label}</Label>
              <Textarea
                id={campo.chave}
                value={respostas[campo.chave]}
                placeholder={campo.placeholder}
                onChange={(e) =>
                  setRespostas((prev) => ({
                    ...prev,
                    [campo.chave]: e.target.value,
                  }))
                }
              />
            </div>
          ))}
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
