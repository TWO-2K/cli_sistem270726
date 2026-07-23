import { createClient } from "@/lib/supabase/server";
import type {
  Agendamento,
  Paciente,
  Procedimento,
  Profissional,
  Sala,
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
import { NovoAgendamentoDialog } from "./novo-agendamento-dialog";

const STATUS_LABEL: Record<Agendamento["status"], string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
  faltou: "Faltou",
};

const STATUS_VARIANT: Record<
  Agendamento["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  agendado: "secondary",
  confirmado: "default",
  em_atendimento: "default",
  concluido: "outline",
  cancelado: "destructive",
  faltou: "destructive",
};

export default async function AgendaPage() {
  const supabase = await createClient();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [
    { data: agendamentos },
    { data: pacientes },
    { data: profissionais },
    { data: salas },
    { data: procedimentos },
  ] = await Promise.all([
    supabase
      .from("agendamentos")
      .select("*")
      .gte("data_hora", startOfDay.toISOString())
      .lte("data_hora", endOfDay.toISOString())
      .order("data_hora")
      .returns<Agendamento[]>(),
    supabase.from("pacientes").select("*").order("nome").returns<Paciente[]>(),
    supabase
      .from("profissionais")
      .select("*")
      .eq("ativo", true)
      .order("nome")
      .returns<Profissional[]>(),
    supabase.from("salas").select("*").order("nome").returns<Sala[]>(),
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
  const salasMap = new Map((salas ?? []).map((s) => [s.id, s]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-muted-foreground">
            Agendamentos de hoje,{" "}
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
            .
          </p>
        </div>
        <NovoAgendamentoDialog
          pacientes={pacientes ?? []}
          profissionais={profissionais ?? []}
          salas={salas ?? []}
          procedimentos={procedimentos ?? []}
        />
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Horário</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Profissional</TableHead>
              <TableHead>Sala</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(agendamentos ?? []).map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">
                  {new Date(a.data_hora).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  {pacientesMap.get(a.paciente_id)?.nome ?? "—"}
                </TableCell>
                <TableCell>
                  {profissionaisMap.get(a.profissional_id)?.nome ?? "—"}
                </TableCell>
                <TableCell>
                  {a.sala_id ? (salasMap.get(a.sala_id)?.nome ?? "—") : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[a.status]}>
                    {STATUS_LABEL[a.status]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {(agendamentos ?? []).length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  Nenhum agendamento para hoje.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
