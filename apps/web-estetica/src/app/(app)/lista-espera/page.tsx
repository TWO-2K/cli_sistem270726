import { createClient } from "@empresa/supabase/server";
import { requireUsuarioEmpresa } from "@/lib/current-empresa";
import type { ListaEspera, Paciente, Procedimento, Usuario } from "@/lib/types/db";
import { ListaEsperaTabela } from "./lista-espera-tabela";

export default async function ListaEsperaPage() {
  await requireUsuarioEmpresa(["admin", "recepcao"]);
  const supabase = await createClient();

  const [
    { data: listaEspera },
    { data: pacientes },
    { data: usuarios },
    { data: procedimentos },
  ] = await Promise.all([
    supabase
      .from("lista_espera")
      .select("*")
      .order("criado_em", { ascending: true })
      .returns<ListaEspera[]>(),
    supabase.from("pacientes").select("*").order("nome").returns<Paciente[]>(),
    supabase
      .from("usuarios")
      .select("*")
      .eq("atende", true)
      .order("nome")
      .returns<Usuario[]>(),
    supabase
      .from("procedimentos")
      .select("*")
      .order("nome")
      .returns<Procedimento[]>(),
  ]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">
          Lista de espera
        </h1>
        <p className="text-muted-foreground">
          Quando um horário é liberado por cancelamento, o paciente compatível
          nessa lista é avisado automaticamente por e-mail.
        </p>
      </div>

      <ListaEsperaTabela
        listaEspera={listaEspera ?? []}
        pacientes={pacientes ?? []}
        usuarios={usuarios ?? []}
        procedimentos={procedimentos ?? []}
      />
    </div>
  );
}
