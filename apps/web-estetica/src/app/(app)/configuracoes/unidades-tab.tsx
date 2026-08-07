"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@empresa/supabase/client";
import { Button } from "@empresa/ui/components/button";
import { Input } from "@empresa/ui/components/input";
import { Badge } from "@empresa/ui/components/badge";
import type { Unidade } from "@/lib/types/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@empresa/ui/components/table";

export function UnidadesTab({ unidades }: { unidades: Unidade[] }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [loading, setLoading] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [enderecoEdicao, setEnderecoEdicao] = useState("");
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [alternandoId, setAlternandoId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("unidades")
      .insert({ nome, endereco: endereco || null });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível cadastrar a unidade.");
      return;
    }
    setNome("");
    setEndereco("");
    toast.success("Unidade cadastrada.");
    router.refresh();
  }

  function iniciarEdicao(unidade: Unidade) {
    setEditandoId(unidade.id);
    setNomeEdicao(unidade.nome);
    setEnderecoEdicao(unidade.endereco ?? "");
  }

  async function salvarEdicao(id: string) {
    setSalvandoId(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("unidades")
      .update({ nome: nomeEdicao, endereco: enderecoEdicao || null })
      .eq("id", id);
    setSalvandoId(null);
    if (error) {
      toast.error("Não foi possível atualizar a unidade.");
      return;
    }
    setEditandoId(null);
    router.refresh();
  }

  async function alternarAtivo(unidade: Unidade) {
    setAlternandoId(unidade.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("unidades")
      .update({ ativo: !unidade.ativo })
      .eq("id", unidade.id);
    setAlternandoId(null);
    if (error) {
      toast.error("Não foi possível atualizar a unidade.");
      return;
    }
    toast.success(unidade.ativo ? "Unidade desativada." : "Unidade reativada.");
    router.refresh();
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Unidades/filiais da empresa. Cada usuário pode ser vinculado a uma
        unidade na aba Usuários — o vínculo é feito lá, não existe troca de
        unidade dentro do sistema.
      </p>
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
          <label className="text-sm font-medium">Endereço</label>
          <Input
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder="Opcional"
            className="w-72"
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
              <TableHead>Endereço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unidades.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {editandoId === u.id ? (
                    <Input
                      value={nomeEdicao}
                      onChange={(e) => setNomeEdicao(e.target.value)}
                      className="w-56"
                    />
                  ) : (
                    u.nome
                  )}
                </TableCell>
                <TableCell>
                  {editandoId === u.id ? (
                    <Input
                      value={enderecoEdicao}
                      onChange={(e) => setEnderecoEdicao(e.target.value)}
                      className="w-72"
                    />
                  ) : (
                    (u.endereco ?? "—")
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={u.ativo ? "default" : "outline"}>
                    {u.ativo ? "Ativa" : "Inativa"}
                  </Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-2 text-right">
                  {editandoId === u.id ? (
                    <>
                      <Button
                        size="sm"
                        disabled={salvandoId === u.id}
                        onClick={() => salvarEdicao(u.id)}
                      >
                        {salvandoId === u.id ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={salvandoId === u.id}
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
                        onClick={() => iniciarEdicao(u)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={alternandoId === u.id}
                        onClick={() => alternarAtivo(u)}
                      >
                        {alternandoId === u.id
                          ? "Aguarde..."
                          : u.ativo
                            ? "Desativar"
                            : "Reativar"}
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {unidades.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-6 text-center text-muted-foreground"
                >
                  Nenhuma unidade cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
