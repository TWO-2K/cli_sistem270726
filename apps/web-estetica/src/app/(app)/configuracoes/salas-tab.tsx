"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@empresa/supabase/client";
import { Button } from "@empresa/ui/components/button";
import { Input } from "@empresa/ui/components/input";
import type { Sala } from "@/lib/types/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@empresa/ui/components/table";

export function SalasTab({ salas }: { salas: Sala[] }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

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
    setSalvandoId(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("salas")
      .update({ nome: nomeEdicao })
      .eq("id", id);
    setSalvandoId(null);
    if (error) {
      toast.error("Não foi possível atualizar a sala.");
      return;
    }
    setEditandoId(null);
    router.refresh();
  }

  async function excluirSala(id: string) {
    if (!window.confirm("Excluir esta sala?")) return;
    setExcluindoId(id);
    const supabase = createClient();
    const { error } = await supabase.from("salas").delete().eq("id", id);
    setExcluindoId(null);
    if (error) {
      if (error.code === "23503") {
        toast.error(
          "Não é possível excluir: esta sala possui agendamentos vinculados.",
        );
        return;
      }
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

      <div className="overflow-x-auto rounded-lg border bg-card">
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
                      <Button
                        size="sm"
                        disabled={salvandoId === s.id}
                        onClick={() => salvarEdicao(s.id)}
                      >
                        {salvandoId === s.id ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={salvandoId === s.id}
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
                        disabled={excluindoId === s.id}
                        onClick={() => iniciarEdicao(s)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={excluindoId === s.id}
                        onClick={() => excluirSala(s.id)}
                      >
                        {excluindoId === s.id ? "Excluindo..." : "Excluir"}
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
