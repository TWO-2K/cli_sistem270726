import { createClient } from "@empresa/supabase/server";
import { requireUsuarioEmpresa } from "@/lib/current-empresa";
import type { Lead, Usuario } from "@/lib/types/db";
import { LeadsBoard } from "./leads-board";

export default async function LeadsPage() {
  await requireUsuarioEmpresa(["admin", "recepcao", "financeiro"]);
  const supabase = await createClient();

  const [{ data: leads }, { data: usuarios }] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .order("criado_em", { ascending: false })
      .returns<Lead[]>(),
    supabase
      .from("usuarios")
      .select("*")
      .order("nome")
      .returns<Usuario[]>(),
  ]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">
          Funil de leads
        </h1>
        <p className="text-muted-foreground">
          Acompanhe contatos captados até virarem pacientes.
        </p>
      </div>

      <LeadsBoard leads={leads ?? []} usuarios={usuarios ?? []} />
    </div>
  );
}
