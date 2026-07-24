"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Receipt, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ComandaItem } from "@/lib/types/db";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ComandaDetailDialog({
  comandaId,
  itens,
  editavel,
}: {
  comandaId: string;
  itens: ComandaItem[];
  editavel: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [valorUnitario, setValorUnitario] = useState("");

  const total = itens.reduce(
    (sum, i) => sum + i.quantidade * Number(i.valor_unitario),
    0,
  );

  async function recalcularTotal(supabase: ReturnType<typeof createClient>) {
    const { data: atuais } = await supabase
      .from("comanda_itens")
      .select("quantidade, valor_unitario")
      .eq("comanda_id", comandaId)
      .returns<{ quantidade: number; valor_unitario: number }[]>();

    const novoTotal = (atuais ?? []).reduce(
      (sum, i) => sum + i.quantidade * Number(i.valor_unitario),
      0,
    );

    const { error } = await supabase
      .from("comandas")
      .update({ total: novoTotal })
      .eq("id", comandaId);

    if (error) {
      toast.error("Item salvo, mas não foi possível atualizar o total da comanda.");
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao.trim() || !valorUnitario) return;
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.from("comanda_itens").insert({
      comanda_id: comandaId,
      descricao: descricao.trim(),
      quantidade: Number(quantidade) || 1,
      valor_unitario: Number(valorUnitario),
    });

    if (error) {
      toast.error("Não foi possível adicionar o item.");
      setLoading(false);
      return;
    }

    await recalcularTotal(supabase);
    setLoading(false);
    setDescricao("");
    setQuantidade("1");
    setValorUnitario("");
    toast.success("Item adicionado.");
    router.refresh();
  }

  async function handleRemove(itemId: string) {
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("comanda_itens")
      .delete()
      .eq("id", itemId);

    if (error) {
      toast.error("Não foi possível remover o item.");
      setLoading(false);
      return;
    }

    await recalcularTotal(supabase);
    setLoading(false);
    toast.success("Item removido.");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" />}>
        <Receipt className="h-4 w-4" />
        Ver comanda
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Itens da comanda</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {itens.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum item na comanda.
            </p>
          )}
          {itens.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <div>
                <p>{item.descricao}</p>
                <p className="text-xs text-muted-foreground">
                  {item.quantidade}x {formatBRL(Number(item.valor_unitario))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {formatBRL(item.quantidade * Number(item.valor_unitario))}
                </span>
                {editavel && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={loading}
                    onClick={() => handleRemove(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
            <span>Total</span>
            <span>{formatBRL(total)}</span>
          </div>
        </div>

        {editavel && (
          <form
            onSubmit={handleAdd}
            className="flex flex-col gap-3 border-t pt-4"
          >
            <p className="text-sm font-medium">Adicionar item avulso</p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                required
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Produto ou serviço avulso"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="quantidade">Qtd.</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min={1}
                  step={1}
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="valorUnitario">Valor unit. (R$)</Label>
                <Input
                  id="valorUnitario"
                  type="number"
                  min={0}
                  step={0.01}
                  required
                  value={valorUnitario}
                  onChange={(e) => setValorUnitario(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Adicionando..." : "Adicionar item"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
