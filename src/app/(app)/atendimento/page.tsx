import { createClient } from "@/lib/supabase/server";
import { requireUsuarioClinica } from "@/lib/current-clinica";
import type {
  Atendimento,
  Paciente,
  Procedimento,
  Usuario,
} from "@/lib/types/db";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NovoAtendimentoDialog } from "./novo-atendimento-dialog";
import { ConcluirAtendimentoDialog } from "./concluir-atendimento-dialog";
import { FotosAtendimentoDialog } from "./fotos-atendimento-dialog";

export default async function AtendimentoPage() {
  const { clinica } = await requireUsuarioClinica();
  const supabase = await createClient();

  const [
    { data: atendimentos },
    { data: pacientes },
    { data: profissionais },
    { data: procedimentos },
  ] = await Promise.all([
    supabase
      .from("atendimentos")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(50)
      .returns<Atendimento[]>(),
    supabase.from("pacientes").select("*").order("nome").returns<Paciente[]>(),
    supabase
      .from("usuarios")
      .select("*")
      .eq("atende", true)
      .eq("ativo", true)
      .order("nome")
      .returns<Usuario[]>(),
    supabase
      .from("procedimentos")
      .select("*")
      .order("nome")
      .returns<Procedimento[]>(),
  ]);

  const pacientesMap = new Map((pacientes ?? []).map((p) => [p.id, p]));
  const profissionaisMap = new Map(
    (profissionais ?? []).map((p) => [p.id, p]),
  );
  const procedimentosMap = new Map(
    (procedimentos ?? []).map((p) => [p.id, p]),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Atendimento
          </h1>
          <p className="text-muted-foreground">
            Prontuário, procedimentos e evolução dos atendimentos.
          </p>
        </div>
        <NovoAtendimentoDialog
          pacientes={pacientes ?? []}
          profissionais={profissionais ?? []}
          procedimentos={procedimentos ?? []}
        />
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Profissional</TableHead>
              <TableHead>Procedimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(atendimentos ?? []).map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  {new Date(a.criado_em).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell className="font-medium">
                  {pacientesMap.get(a.paciente_id)?.nome ?? "—"}
                </TableCell>
                <TableCell>
                  {profissionaisMap.get(a.usuario_id)?.nome ?? "—"}
                </TableCell>
                <TableCell>
                  {a.procedimento_id
                    ? (procedimentosMap.get(a.procedimento_id)?.nome ?? "—")
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      a.status === "concluido" ? "outline" : "default"
                    }
                  >
                    {a.status === "concluido" ? "Concluído" : "Em andamento"}
                  </Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-2 text-right">
                  {a.status === "em_andamento" && (
                    <>
                      <FotosAtendimentoDialog
                        clinicaId={clinica.id}
                        atendimentoId={a.id}
                        pacienteId={a.paciente_id}
                      />
                      <ConcluirAtendimentoDialog
                        atendimentoId={a.id}
                        pacienteId={a.paciente_id}
                        procedimento={
                          a.procedimento_id
                            ? (procedimentosMap.get(a.procedimento_id) ?? null)
                            : null
                        }
                      />
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(atendimentos ?? []).length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  Nenhum atendimento registrado ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
