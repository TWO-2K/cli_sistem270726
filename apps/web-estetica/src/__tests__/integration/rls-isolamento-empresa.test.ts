import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient, empresaDeTesteId, usuarioDeTesteClient } from "./helpers";

/**
 * Cobre a linha de defesa principal do multi-tenant: RLS por `empresa_id`.
 * Um usuário autenticado de uma empresa não pode ler nem escrever dados de
 * outra empresa, mesmo sabendo o id da linha (não é só a UI que esconde).
 */
describe("RLS: isolamento entre empresas", () => {
  let client: SupabaseClient;
  let outraEmpresaId: string;
  let pacienteDeOutraEmpresaId: string | null;

  beforeAll(async () => {
    client = await usuarioDeTesteClient();
    const empresaTesteId = await empresaDeTesteId();

    const admin = adminClient();
    const { data: outraEmpresa, error } = await admin
      .from("empresas")
      .select("id")
      .neq("id", empresaTesteId)
      .limit(1)
      .single();

    if (error || !outraEmpresa) {
      throw new Error(
        "Nenhuma outra empresa encontrada no banco remoto para testar isolamento de RLS.",
      );
    }
    outraEmpresaId = outraEmpresa.id;

    const { data: paciente } = await admin
      .from("pacientes")
      .select("id")
      .eq("empresa_id", outraEmpresaId)
      .limit(1)
      .maybeSingle();

    pacienteDeOutraEmpresaId = paciente?.id ?? null;
  });

  it("não retorna pacientes de outra empresa numa listagem", async () => {
    const { data, error } = await client
      .from("pacientes")
      .select("id, empresa_id")
      .eq("empresa_id", outraEmpresaId);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("não consegue ler um paciente específico de outra empresa pelo id", async () => {
    if (!pacienteDeOutraEmpresaId) {
      // Ambiente sem paciente cadastrado na outra empresa: nada a validar aqui,
      // o teste anterior já cobre a listagem vazia.
      return;
    }

    const { data, error } = await client
      .from("pacientes")
      .select("id")
      .eq("id", pacienteDeOutraEmpresaId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("não consegue inserir uma linha marcada com empresa_id de outra empresa", async () => {
    const { data, error } = await client
      .from("pacientes")
      .insert({ nome: "QA RLS Cross-Tenant", empresa_id: outraEmpresaId })
      .select("id, empresa_id")
      .single();

    // O trigger `set_empresa_id()` sobrescreve para a empresa do usuário
    // autenticado — o valor cross-tenant enviado no insert é ignorado.
    expect(error).toBeNull();
    expect(data!.empresa_id).not.toBe(outraEmpresaId);

    await adminClient().from("pacientes").delete().eq("id", data!.id);
  });
});
