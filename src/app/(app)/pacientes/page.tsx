import { createClient } from "@/lib/supabase/server";
import type { Paciente } from "@/lib/types/db";
import { NovoPacienteDialog } from "./novo-paciente-dialog";
import { PacientesTable } from "./pacientes-table";

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

      <PacientesTable pacientes={pacientes ?? []} />
    </div>
  );
}
