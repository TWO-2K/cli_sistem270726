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

    const { data, error } = await supabase.rpc("registrar_pagamento", {
      p_comanda_id: comandaId,
      p_forma_pagamento: forma,
      p_valor: valorTotal,
      p_num_parcelas: numParcelas,
    });

    setLoading(false);

    if (error || !data) {
      toast.error("Não foi possível registrar o pagamento.");
      return;
    }

    const cobreTotal = (data as { cobre_total: boolean }).cobre_total;

    toast.success(
      !cobreTotal
        ? "Pagamento parcial registrado. A comanda permanece em aberto até quitar o valor total."
        : numParcelas === 1
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
