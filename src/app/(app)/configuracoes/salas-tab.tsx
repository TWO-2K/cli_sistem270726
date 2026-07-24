"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Sala } from "@/lib/types/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function SalasTab({ salas }: { salas: Sala[] }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("salas").insert({ nome });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível cadastrar a sala.");
      return;
    }
    setNome("");
    router.refresh();
  }

  function iniciarEdicao(sala: Sala) {
    setEditandoId(sala.id);
    setNomeEdicao(sala.nome);
  }

  async function salvarEdicao(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("salas")
      .update({ nome: nomeEdicao })
      .eq("id", id);
    if (error) {
      toast.error("Não foi possível atualizar a sala.");
      return;
    }
    setEditandoId(null);
    router.refresh();
  }

  async function excluirSala(id: string) {
    if (!window.confirm("Excluir esta sala?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("salas").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível excluir a sala.");
      return;
    }
    toast.success("Sala excluída.");
    router.refresh();
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Nome da sala</label>
          <Input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-56"
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
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {salas.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  {editandoId === s.id ? (
                    <Input
                      value={nomeEdicao}
                      onChange={(e) => setNomeEdicao(e.target.value)}
                      className="w-56"
                    />
                  ) : (
                    s.nome
                  )}
                </TableCell>
                <TableCell className="flex justify-end gap-2 text-right">
                  {editandoId === s.id ? (
                    <>
                      <Button size="sm" onClick={() => salvarEdicao(s.id)}>
                        Salvar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditandoId(null)}
                      >
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => iniciarEdicao(s)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => excluirSala(s.id)}
                      >
                        Excluir
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {salas.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="py-6 text-center text-muted-foreground"
                >
                  Nenhuma sala cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
