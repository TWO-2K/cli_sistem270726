"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Paciente } from "@/lib/types/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PacientesTable({ pacientes }: { pacientes: Paciente[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");

  const filtrados = pacientes.filter((p) =>
    p.nome.toLowerCase().includes(busca.trim().toLowerCase()),
  );

  async function excluirPaciente(id: string) {
    if (
      !window.confirm(
        "Excluir este paciente? Todo o histórico associado também será removido.",
      )
    )
      return;
    const supabase = createClient();
    const { error } = await supabase.from("pacientes").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível excluir o paciente.");
      return;
    }
    toast.success("Paciente excluído.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por nome..."
        className="w-64"
      />

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Cadastrado em</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((paciente) => (
              <TableRow key={paciente.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/pacientes/${paciente.id}`}
                    className="hover:underline"
                  >
                    {paciente.nome}
                  </Link>
                </TableCell>
                <TableCell>{paciente.telefone ?? "—"}</TableCell>
                <TableCell>{paciente.email ?? "—"}</TableCell>
                <TableCell>
                  {new Date(paciente.criado_em).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => excluirPaciente(paciente.id)}
                  >
                    Excluir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtrados.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  {pacientes.length === 0
                    ? "Nenhum paciente cadastrado ainda."
                    : "Nenhum paciente encontrado."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
