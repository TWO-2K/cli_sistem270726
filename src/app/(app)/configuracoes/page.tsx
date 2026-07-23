import { createClient } from "@/lib/supabase/server";
import type { Procedimento, Profissional, Sala } from "@/lib/types/db";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ProfissionaisTab } from "./profissionais-tab";
import { SalasTab } from "./salas-tab";
import { ProcedimentosTab } from "./procedimentos-tab";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const [{ data: profissionais }, { data: salas }, { data: procedimentos }] =
    await Promise.all([
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
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Configurações
        </h1>
        <p className="text-muted-foreground">
          Profissionais, salas e procedimentos da clínica.
        </p>
      </div>

      <Tabs defaultValue="profissionais">
        <TabsList>
          <TabsTrigger value="profissionais">Profissionais</TabsTrigger>
          <TabsTrigger value="salas">Salas</TabsTrigger>
          <TabsTrigger value="procedimentos">Procedimentos</TabsTrigger>
        </TabsList>
        <TabsContent value="profissionais">
          <ProfissionaisTab profissionais={profissionais ?? []} />
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
