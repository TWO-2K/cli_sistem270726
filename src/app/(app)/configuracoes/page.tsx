import { createClient } from "@/lib/supabase/server";
import { requireUsuarioClinica } from "@/lib/current-clinica";
import type { Procedimento, Profissional, Sala, Usuario } from "@/lib/types/db";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PerfilTab } from "./perfil-tab";
import { ProfissionaisTab } from "./profissionais-tab";
import { SalasTab } from "./salas-tab";
import { ProcedimentosTab } from "./procedimentos-tab";
import { UsuariosTab } from "./usuarios-tab";

export default async function ConfiguracoesPage() {
  const { clinica } = await requireUsuarioClinica();
  const supabase = await createClient();
  const [
    { data: profissionais },
    { data: salas },
    { data: procedimentos },
    { data: usuarios },
  ] = await Promise.all([
    supabase
      .from("profissionais")
      .select("*")
      .order("nome")
      .returns<Profissional[]>(),
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
          Perfil da empresa, profissionais, salas e procedimentos da clínica.
        </p>
      </div>

      <Tabs defaultValue="perfil">
        <TabsList>
          <TabsTrigger value="perfil">Perfil da empresa</TabsTrigger>
          <TabsTrigger value="profissionais">Profissionais</TabsTrigger>
          <TabsTrigger value="salas">Salas</TabsTrigger>
          <TabsTrigger value="procedimentos">Procedimentos</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
        </TabsList>
        <TabsContent value="perfil">
          <PerfilTab clinica={clinica} />
        </TabsContent>
        <TabsContent value="profissionais">
          <ProfissionaisTab profissionais={profissionais ?? []} />
        </TabsContent>
        <TabsContent value="salas">
          <SalasTab salas={salas ?? []} />
        </TabsContent>
        <TabsContent value="procedimentos">
          <ProcedimentosTab procedimentos={procedimentos ?? []} />
        </TabsContent>
        <TabsContent value="usuarios">
          <UsuariosTab usuarios={usuarios ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
