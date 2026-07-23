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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const { error: pagamentoError } = await supabase.from("pagamentos").insert({
      comanda_id: comandaId,
      forma_pagamento: forma,
      valor: Number(valor),
      status: "pago",
    });

    if (pagamentoError) {
      toast.error("Não foi possível registrar o pagamento.");
      setLoading(false);
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

    toast.success("Pagamento registrado e comanda fechada.");
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
