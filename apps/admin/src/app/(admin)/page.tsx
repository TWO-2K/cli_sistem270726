import Link from "next/link";
import { createClient } from "@empresa/supabase/server";
import { SEGMENTO_LABELS, type Empresa } from "@empresa/supabase/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@empresa/ui/components/card";
import { Badge } from "@empresa/ui/components/badge";
import { NovaEmpresaDialog } from "./nova-empresa-dialog";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: empresas } = await supabase
    .from("empresas")
    .select("*")
    .order("criado_em", { ascending: false })
    .returns<Empresa[]>();

  const { count: totalUsuarios } = await supabase
    .from("usuarios")
    .select("*", { count: "exact", head: true })
    .neq("perfil", "super_admin");

  const total = (empresas ?? []).length;
  const ativas = (empresas ?? []).filter((c) => c.status === "ativa").length;
  const suspensas = total - ativas;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Empresas</h1>
          <p className="text-muted-foreground">
            Crie uma empresa e o usuário admin responsável por ela.
          </p>
        </div>
        <NovaEmpresaDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Empresas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{total}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Ativas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{ativas}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Suspensas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {suspensas}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Usuários
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {totalUsuarios ?? 0}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(empresas ?? []).map((empresa) => (
          <Link key={empresa.id} href={`/empresas/${empresa.id}`}>
            <Card className="transition-colors hover:bg-muted/40">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{empresa.nome}</CardTitle>
                <Badge variant={empresa.status === "ativa" ? "default" : "outline"}>
                  {empresa.status === "ativa" ? "Ativa" : "Suspensa"}
                </Badge>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {SEGMENTO_LABELS[empresa.segmento]}
              </CardContent>
            </Card>
          </Link>
        ))}
        {(empresas ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma empresa cadastrada ainda.
          </p>
        )}
      </div>
    </div>
  );
}
