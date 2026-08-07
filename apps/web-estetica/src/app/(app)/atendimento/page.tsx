import { createClient } from "@empresa/supabase/server";
import { requireUsuarioEmpresa } from "@/lib/current-empresa";
import type {
  Atendimento,
  Paciente,
  Procedimento,
  Usuario,
} from "@/lib/types/db";
import { Badge } from "@empresa/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@empresa/ui/components/table";
import { NovoAtendimentoDialog } from "./novo-atendimento-dialog";
import { ConcluirAtendimentoDialog } from "./concluir-atendimento-dialog";
import { FotosAtendimentoDialog } from "./fotos-atendimento-dialog";

export default async function AtendimentoPage() {
  const { empresa } = await requireUsuarioEmpresa();
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
      <div className="flex flex-wrap items-center justify-between gap-3">
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

      <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
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
                  <div className="flex flex-wrap gap-1">
                    <Badge
                      variant={
                        a.status === "concluido" ? "outline" : "default"
                      }
                    >
                      {a.status === "concluido" ? "Concluído" : "Em andamento"}
                    </Badge>
                    {a.agendamento_id && (
                      <Badge variant="outline">Via agenda</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="flex justify-end gap-2 text-right">
                  {a.status === "em_andamento" && (
                    <>
                      <FotosAtendimentoDialog
                        empresaId={empresa.id}
                        atendimentoId={a.id}
                        pacienteId={a.paciente_id}
                      />
                      <ConcluirAtendimentoDialog
                        atendimentoId={a.id}
                        pacienteId={a.paciente_id}
                        pacienteConvenioId={
                          pacientesMap.get(a.paciente_id)?.convenio_id
                        }
                        agendamentoId={a.agendamento_id}
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

      <div className="flex flex-col gap-3 md:hidden">
        {(atendimentos ?? []).length === 0 && (
          <div className="rounded-lg border bg-card py-8 text-center text-muted-foreground">
            Nenhum atendimento registrado ainda.
          </div>
        )}
        {(atendimentos ?? []).map((a) => (
          <div
            key={a.id}
            className="flex flex-col gap-2 rounded-lg border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium">
                {pacientesMap.get(a.paciente_id)?.nome ?? "—"}
              </span>
              <div className="flex flex-wrap gap-1">
                <Badge variant={a.status === "concluido" ? "outline" : "default"}>
                  {a.status === "concluido" ? "Concluído" : "Em andamento"}
                </Badge>
                {a.agendamento_id && <Badge variant="outline">Via agenda</Badge>}
              </div>
            </div>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <span>{new Date(a.criado_em).toLocaleString("pt-BR")}</span>
              <span>
                Profissional: {profissionaisMap.get(a.usuario_id)?.nome ?? "—"}
              </span>
              <span>
                Procedimento:{" "}
                {a.procedimento_id
                  ? (procedimentosMap.get(a.procedimento_id)?.nome ?? "—")
                  : "—"}
              </span>
            </div>
            {a.status === "em_andamento" && (
              <div className="flex justify-end gap-2 border-t pt-3">
                <FotosAtendimentoDialog
                  empresaId={empresa.id}
                  atendimentoId={a.id}
                  pacienteId={a.paciente_id}
                />
                <ConcluirAtendimentoDialog
                  atendimentoId={a.id}
                  pacienteId={a.paciente_id}
                  pacienteConvenioId={
                    pacientesMap.get(a.paciente_id)?.convenio_id
                  }
                  procedimento={
                    a.procedimento_id
                      ? (procedimentosMap.get(a.procedimento_id) ?? null)
                      : null
                  }
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
