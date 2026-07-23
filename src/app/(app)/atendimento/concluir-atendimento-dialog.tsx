"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Procedimento } from "@/lib/types/db";

export function ConcluirAtendimentoDialog({
  atendimentoId,
  pacienteId,
  procedimento,
}: {
  atendimentoId: string;
  pacienteId: string;
  procedimento: Procedimento | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [texto, setTexto] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    if (texto.trim()) {
      const { error: evolucaoError } = await supabase.from("evolucoes").insert({
        atendimento_id: atendimentoId,
        paciente_id: pacienteId,
        texto: texto.trim(),
      });
      if (evolucaoError) {
        toast.error("Não foi possível salvar a evolução.");
        setLoading(false);
        return;
      }
    }

    const { error: atendimentoError } = await supabase
      .from("atendimentos")
      .update({ status: "concluido" })
      .eq("id", atendimentoId);

    if (atendimentoError) {
      toast.error("Não foi possível concluir o atendimento.");
      setLoading(false);
      return;
    }

    const { data: comanda, error: comandaError } = await supabase
      .from("comandas")
      .insert({
        atendimento_id: atendimentoId,
        paciente_id: pacienteId,
        total: procedimento?.preco ?? 0,
      })
      .select("id")
      .single();

    if (!comandaError && comanda && procedimento) {
      await supabase.from("comanda_itens").insert({
        comanda_id: comanda.id,
        procedimento_id: procedimento.id,
        descricao: procedimento.nome,
        quantidade: 1,
        valor_unitario: procedimento.preco,
      });
    }

    setLoading(false);
    toast.success("Atendimento concluído e comanda gerada.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Concluir
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Concluir atendimento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="evolucao">Evolução (opcional)</Label>
            <Textarea
              id="evolucao"
              rows={4}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Observações sobre o atendimento..."
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Ao concluir, uma comanda será gerada automaticamente para
            fechamento no Financeiro.
          </p>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Concluir e gerar comanda"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
