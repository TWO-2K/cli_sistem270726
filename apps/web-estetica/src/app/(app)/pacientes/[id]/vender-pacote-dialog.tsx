"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@empresa/supabase/client";
import { Button } from "@empresa/ui/components/button";
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
  DialogTrigger,
} from "@empresa/ui/components/dialog";
import type { Procedimento } from "@/lib/types/db";

export function VenderPacoteDialog({
  pacienteId,
  procedimentos,
}: {
  pacienteId: string;
  procedimentos: Procedimento[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [procedimentoId, setProcedimentoId] = useState("");
  const [sessoesTotal, setSessoesTotal] = useState("10");
  const [valor, setValor] = useState("");
  const [valorEditadoManualmente, setValorEditadoManualmente] = useState(false);

  const procedimentoSelecionado = procedimentos.find((p) => p.id === procedimentoId);

  function selecionarProcedimento(value: string) {
    setProcedimentoId(value);
    if (!valorEditadoManualmente) {
      const procedimento = procedimentos.find((p) => p.id === value);
      const sessoes = Number(sessoesTotal) || 0;
      setValor(procedimento ? String(procedimento.preco * sessoes) : "");
    }
  }

  function alterarSessoesTotal(value: string) {
    setSessoesTotal(value);
    if (!valorEditadoManualmente && procedimentoSelecionado) {
      const sessoes = Number(value) || 0;
      setValor(String(procedimentoSelecionado.preco * sessoes));
    }
  }

  const podeSubmeter = procedimentoId && Number(sessoesTotal) > 0 && Number(valor) >= 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!podeSubmeter) return;
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.rpc("vender_pacote_sessao", {
      p_paciente_id: pacienteId,
      p_procedimento_id: procedimentoId,
      p_sessoes_total: Number(sessoesTotal),
      p_valor: Number(valor),
    });

    setLoading(false);

    if (error) {
      toast.error("Não foi possível vender o pacote.");
      return;
    }

    toast.success("Pacote vendido.");
    setProcedimentoId("");
    setSessoesTotal("10");
    setValor("");
    setValorEditadoManualmente(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Vender pacote
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vender pacote de sessões</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Procedimento</Label>
            <Select
              value={procedimentoId}
              onValueChange={(value) => selecionarProcedimento(value ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o procedimento">
                  {(value: string) =>
                    procedimentos.find((p) => p.id === value)?.nome ??
                    "Selecione o procedimento"
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
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sessoesTotal">Quantidade de sessões</Label>
            <Input
              id="sessoesTotal"
              type="number"
              min={1}
              step={1}
              required
              value={sessoesTotal}
              onChange={(e) => alterarSessoesTotal(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="valor">Valor do pacote (R$)</Label>
            <Input
              id="valor"
              type="number"
              min={0}
              step={0.01}
              required
              value={valor}
              onChange={(e) => {
                setValorEditadoManualmente(true);
                setValor(e.target.value);
              }}
            />
            {procedimentoSelecionado && !valorEditadoManualmente && (
              <p className="text-xs text-muted-foreground">
                Sugerido: {procedimentoSelecionado.preco.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}{" "}
                × {sessoesTotal || 0} sessões. Você pode ajustar o valor.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !podeSubmeter}>
              {loading ? "Salvando..." : "Vender pacote"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
