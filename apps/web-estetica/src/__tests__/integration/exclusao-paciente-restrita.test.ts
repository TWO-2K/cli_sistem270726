import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient, usuarioDeTesteClient } from "./helpers";

/**
 * Cobre a migration 0009: FKs de `paciente_id` viraram `on delete restrict`
 * para impedir apagar silenciosamente o histórico clínico/financeiro ao
 * excluir um paciente. Paciente sem histórico continua excluível.
 */
describe("pacientes: restrição de exclusão com histórico", () => {
  let client: SupabaseClient;
  let pacienteComHistoricoId: string;
  let pacienteSemHistoricoId: string;
  let agendamentoId: string;

  beforeAll(async () => {
    client = await usuarioDeTesteClient();

    const { data: pacientes, error } = await client
      .from("pacientes")
      .insert([
        { nome: "QA Exclusão Com Histórico" },
        { nome: "QA Exclusão Sem Histórico" },
      ])
      .select("id");

    if (error) throw error;
    pacienteComHistoricoId = pacientes![0].id;
    pacienteSemHistoricoId = pacientes![1].id;

    const {
      data: { user },
    } = await client.auth.getUser();

    const dataHora = new Date();
    dataHora.setDate(dataHora.getDate() + 32);
    dataHora.setHours(9, 0, 0, 0);

    const { data: agendamento, error: erroAgendamento } = await client
      .from("agendamentos")
      .insert({
        paciente_id: pacienteComHistoricoId,
        usuario_id: user!.id,
        data_hora: dataHora.toISOString(),
        duracao_minutos: 30,
        status: "agendado",
      })
      .select("id")
      .single();

    if (erroAgendamento) throw erroAgendamento;
    agendamentoId = agendamento!.id;
  });

  afterAll(async () => {
    const admin = adminClient();
    await admin.from("agendamentos").delete().eq("id", agendamentoId);
    await admin.from("pacientes").delete().eq("id", pacienteComHistoricoId);
    // pacienteSemHistoricoId já deve ter sido excluído pelo próprio teste.
  });

  it("bloqueia exclusão de paciente com agendamento vinculado", async () => {
    const { error } = await client
      .from("pacientes")
      .delete()
      .eq("id", pacienteComHistoricoId);

    expect(error).not.toBeNull();
    expect(error!.code).toBe("23503");
  });

  it("permite exclusão de paciente sem histórico", async () => {
    const { error } = await client
      .from("pacientes")
      .delete()
      .eq("id", pacienteSemHistoricoId);

    expect(error).toBeNull();
  });
});
