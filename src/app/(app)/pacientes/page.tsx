import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Paciente } from "@/lib/types/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NovoPacienteDialog } from "./novo-paciente-dialog";

export default async function PacientesPage() {
  const supabase = await createClient();
  const { data: pacientes } = await supabase
    .from("pacientes")
    .select("*")
    .order("nome")
    .returns<Paciente[]>();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
          <p className="text-muted-foreground">
            Cadastro e histórico dos seus pacientes.
          </p>
        </div>
        <NovoPacienteDialog />
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Cadastrado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(pacientes ?? []).map((paciente) => (
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
              </TableRow>
            ))}
            {(pacientes ?? []).length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-muted-foreground"
                >
                  Nenhum paciente cadastrado ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
