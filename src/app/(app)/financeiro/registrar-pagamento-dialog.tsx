"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
  DialogTrigger,
} from "@/components/ui/dialog";

const FORMAS_PAGAMENTO = ["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito"];

export function RegistrarPagamentoDialog({
  comandaId,
  valorSugerido,
}: {
  comandaId: string;
  valorSugerido: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forma, setForma] = useState(FORMAS_PAGAMENTO[0]);
  const [valor, setValor] = useState(String(valorSugerido));
  const [parcelas, setParcelas] = useState("1");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const numParcelas = Number(parcelas) || 1;
    const valorTotal = Number(valor);

    const { data: pagamento, error: pagamentoError } = await supabase
      .from("pagamentos")
      .insert({
        comanda_id: comandaId,
        forma_pagamento: forma,
        valor: valorTotal,
        status: numParcelas === 1 ? "pago" : "pendente",
      })
      .select("id")
      .single();

    if (pagamentoError || !pagamento) {
      toast.error("Não foi possível registrar o pagamento.");
      setLoading(false);
      return;
    }

    if (numParcelas > 1) {
      const valorParcela = Math.floor((valorTotal / numParcelas) * 100) / 100;
      const ultimaParcela =
        valorTotal - valorParcela * (numParcelas - 1);

      const hoje = new Date();
      const parcelasRows = Array.from({ length: numParcelas }, (_, i) => {
        const vencimento = new Date(hoje);
        vencimento.setMonth(vencimento.getMonth() + i + 1);
        return {
          pagamento_id: pagamento.id,
          vencimento: vencimento.toISOString().slice(0, 10),
          valor: i === numParcelas - 1 ? ultimaParcela : valorParcela,
          status: "pendente" as const,
        };
      });

      const { error: parcelasError } = await supabase
        .from("parcelas")
        .insert(parcelasRows);

      if (parcelasError) {
        toast.error("Pagamento registrado, mas não foi possível gerar as parcelas.");
        setLoading(false);
        return;
      }
    }

    const cobreTotal = valorTotal >= valorSugerido - 0.01;

    if (!cobreTotal) {
      setLoading(false);
      toast.success(
        "Pagamento parcial registrado. A comanda permanece em aberto até quitar o valor total.",
      );
      setOpen(false);
      router.refresh();
      return;
    }

    const { error: comandaError } = await supabase
      .from("comandas")
      .update({ status: "fechada" })
      .eq("id", comandaId);

    setLoading(false);

    if (comandaError) {
      toast.error("Pagamento registrado, mas não foi possível fechar a comanda.");
      return;
    }

    toast.success(
      numParcelas === 1
        ? "Pagamento registrado e comanda fechada."
        : `Pagamento parcelado em ${numParcelas}x registrado e comanda fechada.`,
    );
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Receber
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Forma de pagamento</Label>
            <Select value={forma} onValueChange={(value) => setForma(value ?? FORMAS_PAGAMENTO[0])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMAS_PAGAMENTO.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="valor">Valor (R$)</Label>
            <Input
              id="valor"
              type="number"
              min={0}
              step={0.01}
              required
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Parcelas</Label>
            <Select value={parcelas} onValueChange={(value) => setParcelas(value ?? "1")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n === 1 ? "À vista" : `${n}x`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Confirmar recebimento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
