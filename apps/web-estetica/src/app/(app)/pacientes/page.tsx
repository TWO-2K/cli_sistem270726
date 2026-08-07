import { createClient } from "@empresa/supabase/server";
import type { Convenio, Paciente } from "@/lib/types/db";
import { NovoPacienteDialog } from "./novo-paciente-dialog";
import { PacientesTable, type PacienteComStatus } from "./pacientes-table";

export default async function PacientesPage() {
  const supabase = await createClient();
  const { data: pacientes } = await supabase
    .from("pacientes")
    .select("*")
    .order("nome")
    .returns<Paciente[]>();

  const [
    { data: convenios },
    { data: agendamentos },
    { data: prontuarios },
    { data: anamneses },
    { data: atendimentos },
    { data: evolucoes },
    { data: fotos },
    { data: comandas },
  ] = await Promise.all([
    supabase.from("convenios").select("*").order("nome").returns<Convenio[]>(),
    supabase.from("agendamentos").select("paciente_id, status, data_hora"),
    supabase.from("prontuarios").select("paciente_id"),
    supabase.from("anamneses").select("paciente_id"),
    supabase.from("atendimentos").select("paciente_id, status"),
    supabase.from("evolucoes").select("paciente_id"),
    supabase.from("fotos_atendimento").select("paciente_id"),
    supabase.from("comandas").select("paciente_id"),
  ]);

  const historicoIds = new Set<string>();
  for (const rows of [
    agendamentos,
    prontuarios,
    anamneses,
    atendimentos,
    evolucoes,
    fotos,
    comandas,
  ]) {
    for (const row of rows ?? []) historicoIds.add(row.paciente_id);
  }

  const emTratamentoIds = new Set<string>();
  // Server Component: roda uma vez por request, não é re-render de cliente.
  // eslint-disable-next-line react-hooks/purity
  const agora = Date.now();
  for (const a of agendamentos ?? []) {
    if (
      (a.status === "agendado" || a.status === "confirmado") &&
      new Date(a.data_hora).getTime() >= agora
    ) {
      emTratamentoIds.add(a.paciente_id);
    }
  }
  for (const a of atendimentos ?? []) {
    if (a.status === "em_andamento") emTratamentoIds.add(a.paciente_id);
  }

  const pacientesComStatus: PacienteComStatus[] = (pacientes ?? []).map(
    (p) => ({
      ...p,
      temHistorico: historicoIds.has(p.id),
      emTratamento: emTratamentoIds.has(p.id),
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
          <p className="text-muted-foreground">
            Cadastro e histórico dos seus pacientes.
          </p>
        </div>
        <NovoPacienteDialog convenios={convenios ?? []} />
      </div>

      <PacientesTable
        pacientes={pacientesComStatus}
        convenios={convenios ?? []}
      />
    </div>
  );
}
