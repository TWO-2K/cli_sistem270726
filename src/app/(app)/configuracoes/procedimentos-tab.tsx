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

interface EdicaoProcedimento {
  nome: string;
  duracao: string;
  preco: string;
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
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [edicao, setEdicao] = useState<EdicaoProcedimento>({
    nome: "",
    duracao: "30",
    preco: "0",
  });

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

  function iniciarEdicao(procedimento: Procedimento) {
    setEditandoId(procedimento.id);
    setEdicao({
      nome: procedimento.nome,
      duracao: String(procedimento.duracao_minutos),
      preco: String(procedimento.preco),
    });
  }

  async function salvarEdicao(id: string) {
    setSalvandoId(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("procedimentos")
      .update({
        nome: edicao.nome,
        duracao_minutos: Number(edicao.duracao),
        preco: Number(edicao.preco),
      })
      .eq("id", id);
    setSalvandoId(null);
    if (error) {
      toast.error("Não foi possível atualizar o procedimento.");
      return;
    }
    setEditandoId(null);
    router.refresh();
  }

  async function excluirProcedimento(id: string) {
    if (!window.confirm("Excluir este procedimento?")) return;
    setExcluindoId(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("procedimentos")
      .delete()
      .eq("id", id);
    setExcluindoId(null);
    if (error) {
      toast.error("Não foi possível excluir o procedimento.");
      return;
    }
    toast.success("Procedimento excluído.");
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
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {procedimentos.map((p) => (
              <TableRow key={p.id}>
                {editandoId === p.id ? (
                  <>
                    <TableCell>
                      <Input
                        value={edicao.nome}
                        onChange={(e) =>
                          setEdicao((prev) => ({ ...prev, nome: e.target.value }))
                        }
                        className="w-40"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={5}
                        step={5}
                        value={edicao.duracao}
                        onChange={(e) =>
                          setEdicao((prev) => ({
                            ...prev,
                            duracao: e.target.value,
                          }))
                        }
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={edicao.preco}
                        onChange={(e) =>
                          setEdicao((prev) => ({ ...prev, preco: e.target.value }))
                        }
                        className="w-28"
                      />
                    </TableCell>
                    <TableCell className="flex justify-end gap-2 text-right">
                      <Button
                        size="sm"
                        disabled={salvandoId === p.id}
                        onClick={() => salvarEdicao(p.id)}
                      >
                        {salvandoId === p.id ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={salvandoId === p.id}
                        onClick={() => setEditandoId(null)}
                      >
                        Cancelar
                      </Button>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell>{p.duracao_minutos} min</TableCell>
                    <TableCell>{formatBRL(Number(p.preco))}</TableCell>
                    <TableCell className="flex justify-end gap-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={excluindoId === p.id}
                        onClick={() => iniciarEdicao(p)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={excluindoId === p.id}
                        onClick={() => excluirProcedimento(p.id)}
                      >
                        {excluindoId === p.id ? "Excluindo..." : "Excluir"}
                      </Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
            {procedimentos.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
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
