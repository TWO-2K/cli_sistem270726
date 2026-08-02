"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@empresa/supabase/client";
import { FORMAS_REPASSE } from "@/lib/types/db";
import { Button } from "@empresa/ui/components/button";
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

export function MarcarRepassePagoDialog({ repasseId }: { repasseId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState<string>(FORMAS_REPASSE[0]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("comissoes_repasses")
      .update({
        status: "pago",
        forma_pagamento: formaPagamento,
        pago_em: new Date().toISOString(),
      })
      .eq("id", repasseId);

    setLoading(false);

    if (error) {
      toast.error("Não foi possível marcar o repasse como pago.");
      return;
    }

    toast.success("Repasse marcado como pago.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" size="sm" variant="outline" />}>
        Marcar como pago
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar repasse como pago</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Forma de pagamento</Label>
            <Select
              value={formaPagamento}
              onValueChange={(v) => setFormaPagamento(v ?? FORMAS_REPASSE[0])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMAS_REPASSE.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Confirmar pagamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
