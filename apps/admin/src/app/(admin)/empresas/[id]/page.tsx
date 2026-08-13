import { notFound } from "next/navigation";
import { createClient } from "@empresa/supabase/server";
import { SEGMENTO_LABELS, type Empresa, type Usuario } from "@empresa/supabase/types";
import { Badge } from "@empresa/ui/components/badge";
import { cn } from "@empresa/ui/utils";
import { EditarEmpresaForm } from "./editar-empresa-form";
import { AssinaturaCard } from "./assinatura-card";
import { UsuariosDaEmpresa } from "./usuarios-da-empresa";
import { PageHeader } from "../../page-header";
import { SEGMENTO_BADGE } from "../../segmento-styles";

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
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/", label: "Empresas" }}
        title={empresa.nome}
        description={
          <Badge
            variant="outline"
            className={cn("font-normal", SEGMENTO_BADGE[empresa.segmento])}
          >
            {SEGMENTO_LABELS[empresa.segmento]}
          </Badge>
        }
      />

      <EditarEmpresaForm empresa={empresa} />
      <AssinaturaCard empresa={empresa} />
      <UsuariosDaEmpresa empresaId={empresa.id} usuarios={usuarios ?? []} />
    </div>
  );
}
