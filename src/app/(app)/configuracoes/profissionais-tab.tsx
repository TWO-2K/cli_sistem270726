"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Profissional } from "@/lib/types/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ProfissionaisTab({
  profissionais,
}: {
  profissionais: Profissional[];
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("profissionais").insert({
      nome,
      especialidade: especialidade || null,
    });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível cadastrar o profissional.");
      return;
    }
    setNome("");
    setEspecialidade("");
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
          <label className="text-sm font-medium">Especialidade</label>
          <Input
            value={especialidade}
            onChange={(e) => setEspecialidade(e.target.value)}
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
              <TableHead>Especialidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profissionais.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell>{p.especialidade ?? "—"}</TableCell>
              </TableRow>
            ))}
            {profissionais.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="py-6 text-center text-muted-foreground"
                >
                  Nenhum profissional cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
