"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Procedimento } from "@/lib/types/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ProcedimentosTab({
  procedimentos,
}: {
  procedimentos: Procedimento[];
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [duracao, setDuracao] = useState("30");
  const [preco, setPreco] = useState("0");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("procedimentos").insert({
      nome,
      duracao_minutos: Number(duracao),
      preco: Number(preco),
    });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível cadastrar o procedimento.");
      return;
    }
    setNome("");
    setDuracao("30");
    setPreco("0");
    router.refresh();
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Nome</label>
          <Input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-56"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Duração (min)</label>
          <Input
            type="number"
            min={5}
            step={5}
            value={duracao}
            onChange={(e) => setDuracao(e.target.value)}
            className="w-28"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Preço (R$)</label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            className="w-32"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Adicionar"}
        </Button>
      </form>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Preço</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {procedimentos.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell>{p.duracao_minutos} min</TableCell>
                <TableCell>{formatBRL(Number(p.preco))}</TableCell>
              </TableRow>
            ))}
            {procedimentos.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-6 text-center text-muted-foreground"
                >
                  Nenhum procedimento cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
