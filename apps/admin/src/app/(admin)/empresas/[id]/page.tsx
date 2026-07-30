import { notFound } from "next/navigation";
import { createClient } from "@empresa/supabase/server";
import { SEGMENTO_LABELS, type Empresa, type Usuario } from "@empresa/supabase/types";
import { EditarEmpresaForm } from "./editar-empresa-form";
import { UsuariosDaEmpresa } from "./usuarios-da-empresa";

export default async function EmpresaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: empresa } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", id)
    .maybeSingle<Empresa>();

  if (!empresa) {
    notFound();
  }

  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("*")
    .eq("empresa_id", id)
    .order("nome")
    .returns<Usuario[]>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{empresa.nome}</h1>
        <p className="text-muted-foreground">
          {SEGMENTO_LABELS[empresa.segmento]}
        </p>
      </div>

      <EditarEmpresaForm empresa={empresa} />
      <UsuariosDaEmpresa empresaId={empresa.id} usuarios={usuarios ?? []} />
    </div>
  );
}
