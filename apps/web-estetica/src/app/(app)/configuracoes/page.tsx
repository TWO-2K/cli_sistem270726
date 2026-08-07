import { createClient } from "@empresa/supabase/server";
import { requireUsuarioEmpresa } from "@/lib/current-empresa";
import type {
  ComissaoProcedimento,
  ComissaoProfissional,
  ComissaoProfissionalProcedimento,
  Convenio,
  Procedimento,
  Produto,
  ProdutoProcedimento,
  Sala,
  TabelaPrecoConvenio,
  Usuario,
} from "@/lib/types/db";
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
import { ComissoesTab } from "./comissoes-tab";
import { ProdutosTab } from "./produtos-tab";
import { ConveniosTab } from "./convenios-tab";

export default async function ConfiguracoesPage() {
  const { empresa } = await requireUsuarioEmpresa(["admin"]);
  const supabase = await createClient();
  const [
    { data: salas },
    { data: procedimentos },
    { data: usuarios },
    { data: comissoesProfissional },
    { data: comissoesProcedimento },
    { data: comissoesCombinadas },
    { data: produtos },
    { data: produtoProcedimento },
    { data: convenios },
    { data: tabelaPrecosConvenio },
  ] = await Promise.all([
    supabase.from("salas").select("*").order("nome").returns<Sala[]>(),
    supabase
      .from("procedimentos")
      .select("*")
      .order("nome")
      .returns<Procedimento[]>(),
    supabase.from("usuarios").select("*").order("nome").returns<Usuario[]>(),
    supabase
      .from("comissao_profissional")
      .select("*")
      .returns<ComissaoProfissional[]>(),
    supabase
      .from("comissao_procedimento")
      .select("*")
      .returns<ComissaoProcedimento[]>(),
    supabase
      .from("comissao_profissional_procedimento")
      .select("*")
      .returns<ComissaoProfissionalProcedimento[]>(),
    supabase.from("produtos").select("*").order("nome").returns<Produto[]>(),
    supabase
      .from("produto_procedimento")
      .select("*")
      .returns<ProdutoProcedimento[]>(),
    supabase.from("convenios").select("*").order("nome").returns<Convenio[]>(),
    supabase
      .from("tabela_precos_convenio")
      .select("*")
      .returns<TabelaPrecoConvenio[]>(),
  ]);

  const profissionais = (usuarios ?? []).filter((u) => u.atende);

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
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
          <TabsTrigger value="convenios">Convênios</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
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
        <TabsContent value="estoque">
          <ProdutosTab
            produtos={produtos ?? []}
            procedimentos={procedimentos ?? []}
            vinculos={produtoProcedimento ?? []}
          />
        </TabsContent>
        <TabsContent value="convenios">
          <ConveniosTab
            convenios={convenios ?? []}
            procedimentos={procedimentos ?? []}
            tabelaPrecos={tabelaPrecosConvenio ?? []}
          />
        </TabsContent>
        <TabsContent value="comissoes">
          <ComissoesTab
            profissionais={profissionais}
            procedimentos={procedimentos ?? []}
            comissoesProfissional={comissoesProfissional ?? []}
            comissoesProcedimento={comissoesProcedimento ?? []}
            comissoesCombinadas={comissoesCombinadas ?? []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
