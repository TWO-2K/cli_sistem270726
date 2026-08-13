import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient, empresaDeTesteId, usuarioDeTesteClient } from "./helpers";

/**
 * Cobre a exclusion constraint de `agendamentos` (migration 0004): dois
 * agendamentos do mesmo profissional não podem se sobrepor no tempo.
 * Cancelados/faltosos não contam para o conflito.
 */
describe("agendamentos: constraint de conflito de horário", () => {
  let client: SupabaseClient;
  let empresaId: string;
  let usuarioId: string;
  let pacienteAId: string;
  let pacienteBId: string;
  const agendamentoIds: string[] = [];

  beforeAll(async () => {
    client = await usuarioDeTesteClient();
    empresaId = await empresaDeTesteId();

    const {
      data: { user },
    } = await client.auth.getUser();
    usuarioId = user!.id;

    const { data: pacientes, error } = await client
      .from("pacientes")
      .insert([
        { nome: "QA Conflito A" },
        { nome: "QA Conflito B" },
      ])
      .select("id");

    if (error) throw error;
    pacienteAId = pacientes![0].id;
    pacienteBId = pacientes![1].id;
  });

  afterAll(async () => {
    const admin = adminClient();
    if (agendamentoIds.length > 0) {
      await admin.from("agendamentos").delete().in("id", agendamentoIds);
    }
    await admin
      .from("pacientes")
      .delete()
      .in("id", [pacienteAId, pacienteBId]);
  });

  it("bloqueia dois agendamentos sobrepostos do mesmo profissional", async () => {
    const dataHora = new Date();
    dataHora.setDate(dataHora.getDate() + 30);
    dataHora.setHours(10, 0, 0, 0);

    const { data: primeiro, error: erroPrimeiro } = await client
      .from("agendamentos")
      .insert({
        paciente_id: pacienteAId,
        usuario_id: usuarioId,
        data_hora: dataHora.toISOString(),
        duracao_minutos: 60,
        status: "agendado",
      })
      .select("id")
      .single();

    expect(erroPrimeiro).toBeNull();
    agendamentoIds.push(primeiro!.id);

    // Sobrepõe parcialmente o primeiro (começa 30min depois, mesmo profissional).
    const sobreposto = new Date(dataHora);
    sobreposto.setMinutes(sobreposto.getMinutes() + 30);

    const { data: segundo, error: erroSegundo } = await client
      .from("agendamentos")
      .insert({
        paciente_id: pacienteBId,
        usuario_id: usuarioId,
        data_hora: sobreposto.toISOString(),
        duracao_minutos: 60,
        status: "agendado",
      })
      .select("id")
      .single();

    expect(segundo).toBeNull();
    expect(erroSegundo).not.toBeNull();
    expect(erroSegundo!.code).toBe("23P01");
  });

  it("permite agendamento sobreposto se o conflitante está cancelado", async () => {
    const dataHora = new Date();
    dataHora.setDate(dataHora.getDate() + 31);
    dataHora.setHours(14, 0, 0, 0);

    const { data: cancelado, error: erroCancelado } = await client
      .from("agendamentos")
      .insert({
        paciente_id: pacienteAId,
        usuario_id: usuarioId,
        data_hora: dataHora.toISOString(),
        duracao_minutos: 60,
        status: "cancelado",
      })
      .select("id")
      .single();

    expect(erroCancelado).toBeNull();
    agendamentoIds.push(cancelado!.id);

    const { data: novo, error: erroNovo } = await client
      .from("agendamentos")
      .insert({
        paciente_id: pacienteBId,
        usuario_id: usuarioId,
        data_hora: dataHora.toISOString(),
        duracao_minutos: 60,
        status: "agendado",
      })
      .select("id")
      .single();

    expect(erroNovo).toBeNull();
    agendamentoIds.push(novo!.id);
  });

  it("empresa_id é preenchido automaticamente pelo trigger", async () => {
    const { data } = await adminClient()
      .from("agendamentos")
      .select("empresa_id")
      .in("id", agendamentoIds);

    expect(data!.every((a) => a.empresa_id === empresaId)).toBe(true);
  });
});
