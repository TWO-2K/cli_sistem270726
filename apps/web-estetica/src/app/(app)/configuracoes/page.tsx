import { createClient } from "@empresa/supabase/server";
import { requireUsuarioEmpresa } from "@/lib/current-empresa";
import type { Procedimento, Sala, Usuario } from "@/lib/types/db";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@empresa/ui/components/tabs";
import { PerfilTab } from "./perfil-tab";
import { SalasTab } from "./salas-tab";
import { ProcedimentosTab } from "./procedimentos-tab";
import { UsuariosTab } from "./usuarios-tab";

export default async function ConfiguracoesPage() {
  const { empresa } = await requireUsuarioEmpresa(["admin"]);
  const supabase = await createClient();
  const [{ data: salas }, { data: procedimentos }, { data: usuarios }] =
    await Promise.all([
      supabase.from("salas").select("*").order("nome").returns<Sala[]>(),
      supabase
        .from("procedimentos")
        .select("*")
        .order("nome")
        .returns<Procedimento[]>(),
      supabase.from("usuarios").select("*").order("nome").returns<Usuario[]>(),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Configurações
        </h1>
        <p className="text-muted-foreground">
          Perfil da empresa, usuários, salas e procedimentos da clínica.
        </p>
      </div>

      <Tabs defaultValue="perfil">
        <TabsList>
          <TabsTrigger value="perfil">Perfil da empresa</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="salas">Salas</TabsTrigger>
          <TabsTrigger value="procedimentos">Procedimentos</TabsTrigger>
        </TabsList>
        <TabsContent value="perfil">
          <PerfilTab empresa={empresa} />
        </TabsContent>
        <TabsContent value="usuarios">
          <UsuariosTab usuarios={usuarios ?? []} />
        </TabsContent>
        <TabsContent value="salas">
          <SalasTab salas={salas ?? []} />
        </TabsContent>
        <TabsContent value="procedimentos">
          <ProcedimentosTab procedimentos={procedimentos ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
