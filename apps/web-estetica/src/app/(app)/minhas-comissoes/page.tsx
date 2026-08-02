import { createClient } from "@empresa/supabase/server";
import { requireUsuarioEmpresa } from "@/lib/current-empresa";
import { MinhasComissoesContent } from "./minhas-comissoes-content";
import type {
  ComissaoLancadaComNomes,
  ComissaoRepasseComNome,
} from "../financeiro/comissoes-types";

export default async function MinhasComissoesPage() {
  const { usuario } = await requireUsuarioEmpresa(["profissional"]);
  const supabase = await createClient();

  const [{ data: repasses }, { data: lancamentos }] = await Promise.all([
    supabase
      .from("comissoes_repasses")
      .select("*, usuarios(nome)")
      .eq("usuario_id", usuario.id)
      .order("competencia", { ascending: false })
      .returns<ComissaoRepasseComNome[]>(),
    supabase
      .from("comissoes_lancadas")
      .select("*, usuarios(nome), comandas(pacientes(nome))")
      .eq("usuario_id", usuario.id)
      .order("criado_em", { ascending: false })
      .returns<ComissaoLancadaComNomes[]>(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Minhas comissões
        </h1>
        <p className="text-muted-foreground">
          Extrato dos seus repasses de comissão.
        </p>
      </div>

      <MinhasComissoesContent
        repasses={repasses ?? []}
        lancamentos={lancamentos ?? []}
      />
    </div>
  );
}
