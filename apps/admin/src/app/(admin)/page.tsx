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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@empresa/ui/components/tabs";
import { cn } from "@empresa/ui/utils";
import {
  Building2,
  CircleCheck,
  CircleSlash,
  ShieldCheck,
  Users,
} from "lucide-react";
import { NovaEmpresaDialog } from "./nova-empresa-dialog";
import { NovoSuperAdminDialog } from "./novo-super-admin-dialog";
import { PageHeader } from "./page-header";
import { SEGMENTO_BADGE, SEGMENTO_BORDER_VAR } from "./segmento-styles";

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

  const { data: superAdmins } = await supabase
    .from("usuarios")
    .select("id, nome, email")
    .eq("perfil", "super_admin")
    .order("nome");

  const total = (empresas ?? []).length;
  const ativas = (empresas ?? []).filter((c) => c.status === "ativa").length;
  const suspensas = total - ativas;

  const stats = [
    {
      label: "Empresas",
      value: total,
      icon: Building2,
      accent: "text-primary bg-primary/10",
    },
    {
      label: "Ativas",
      value: ativas,
      icon: CircleCheck,
      accent: "text-success bg-success/10",
    },
    {
      label: "Suspensas",
      value: suspensas,
      icon: CircleSlash,
      accent: "text-warning bg-warning/10",
    },
    {
      label: "Usuários",
      value: totalUsuarios ?? 0,
      icon: Users,
      accent: "text-secondary bg-secondary/10",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Painel administrativo"
        description="Visão geral das empresas cadastradas e das contas com acesso total ao sistema."
        actions={
          <>
            <NovoSuperAdminDialog />
            <NovaEmpresaDialog />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, accent }) => (
          <Card key={label} className="gap-3 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg",
                  accent,
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="font-heading text-3xl font-semibold tracking-tight">
              {value}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="empresas" className="flex flex-col gap-4">
        <TabsList>
          <TabsTrigger value="empresas">
            Empresas
            <Badge variant="secondary" className="ml-1">
              {total}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="super-admins">
            Super admins
            <Badge variant="secondary" className="ml-1">
              {(superAdmins ?? []).length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresas" className="flex flex-col gap-4">
          {total === 0 ? (
            <EmptyState
              icon={Building2}
              title="Nenhuma empresa cadastrada"
              description="Crie a primeira empresa para começar a provisionar acessos."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(empresas ?? []).map((empresa) => (
                <Link key={empresa.id} href={`/empresas/${empresa.id}`}>
                  <Card
                    className="h-full overflow-hidden border-l-4 transition-colors hover:bg-muted/40"
                    style={{
                      borderLeftColor: SEGMENTO_BORDER_VAR[empresa.segmento],
                    }}
                  >
                    <CardHeader className="flex flex-row items-center justify-between gap-2">
                      <CardTitle className="text-base">
                        {empresa.nome}
                      </CardTitle>
                      <Badge
                        variant={
                          empresa.status === "ativa" ? "default" : "outline"
                        }
                        className="shrink-0"
                      >
                        {empresa.status === "ativa" ? "Ativa" : "Suspensa"}
                      </Badge>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-normal",
                          SEGMENTO_BADGE[empresa.segmento],
                        )}
                      >
                        {SEGMENTO_LABELS[empresa.segmento]}
                      </Badge>
                      {empresa.is_teste && (
                        <span className="text-xs text-muted-foreground">
                          Empresa de teste
                        </span>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="super-admins" className="flex flex-col gap-4">
          {(superAdmins ?? []).length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="Nenhum super admin cadastrado"
              description="Super admins têm acesso total ao painel e não pertencem a nenhuma empresa."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(superAdmins ?? []).map((sa) => (
                <Card key={sa.id}>
                  <CardHeader className="flex flex-row items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base">{sa.nome}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {sa.email}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-heading text-base font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
