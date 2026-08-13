import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient, usuarioDeTesteClient } from "./helpers";

/**
 * Cobre as RPCs transacionais de pagamento (migrations 0008/0014):
 * `registrar_pagamento` (cria pagamento + parcelas + fecha a comanda quando
 * o valor cobre o total) e `marcar_parcela_paga` (quita o pagamento quando
 * todas as parcelas ficam pagas).
 */
describe("registrar_pagamento / marcar_parcela_paga", () => {
  let client: SupabaseClient;
  let pacienteId: string;
  const comandaIds: string[] = [];

  beforeAll(async () => {
    client = await usuarioDeTesteClient();

    const { data, error } = await client
      .from("pacientes")
      .insert({ nome: "QA Pagamento RPC" })
      .select("id")
      .single();

    if (error) throw error;
    pacienteId = data.id;
  });

  afterAll(async () => {
    const admin = adminClient();
    if (comandaIds.length > 0) {
      // pagamentos/parcelas caem em cascata via FK on delete cascade.
      await admin.from("comandas").delete().in("id", comandaIds);
    }
    await admin.from("pacientes").delete().eq("id", pacienteId);
  });

  async function criarComanda(total: number) {
    const { data, error } = await client
      .from("comandas")
      .insert({ paciente_id: pacienteId, total })
      .select("id")
      .single();
    if (error) throw error;
    comandaIds.push(data.id);
    return data.id as string;
  }

  it("pagamento à vista fecha a comanda e não gera parcelas", async () => {
    const comandaId = await criarComanda(150);

    const { data, error } = await client.rpc("registrar_pagamento", {
      p_comanda_id: comandaId,
      p_forma_pagamento: "Pix",
      p_valor: 150,
      p_num_parcelas: 1,
    });

    expect(error).toBeNull();
    expect(data.cobre_total).toBe(true);

    const { data: comanda } = await client
      .from("comandas")
      .select("status")
      .eq("id", comandaId)
      .single();
    expect(comanda!.status).toBe("fechada");

    const { data: parcelas } = await client
      .from("parcelas")
      .select("id")
      .eq("pagamento_id", data.pagamento_id);
    expect(parcelas).toHaveLength(0);

    const { data: pagamento } = await client
      .from("pagamentos")
      .select("status")
      .eq("id", data.pagamento_id)
      .single();
    expect(pagamento!.status).toBe("pago");
  });

  it("pagamento parcelado gera N parcelas cuja soma bate com o valor total", async () => {
    const comandaId = await criarComanda(100);

    const { data, error } = await client.rpc("registrar_pagamento", {
      p_comanda_id: comandaId,
      p_forma_pagamento: "Cartão",
      p_valor: 100,
      p_num_parcelas: 3,
    });

    expect(error).toBeNull();

    const { data: parcelas } = await client
      .from("parcelas")
      .select("valor, status")
      .eq("pagamento_id", data.pagamento_id)
      .order("vencimento", { ascending: true });

    expect(parcelas).toHaveLength(3);
    const soma = parcelas!.reduce((acc, p) => acc + Number(p.valor), 0);
    expect(soma).toBeCloseTo(100, 2);
    expect(parcelas!.every((p) => p.status === "pendente")).toBe(true);

    const { data: pagamento } = await client
      .from("pagamentos")
      .select("status")
      .eq("id", data.pagamento_id)
      .single();
    expect(pagamento!.status).toBe("pendente");
  });

  it("marcar_parcela_paga quita o pagamento quando a última parcela é paga", async () => {
    const comandaId = await criarComanda(90);

    const { data: pagamentoData } = await client.rpc("registrar_pagamento", {
      p_comanda_id: comandaId,
      p_forma_pagamento: "Cartão",
      p_valor: 90,
      p_num_parcelas: 3,
    });

    const { data: parcelas } = await client
      .from("parcelas")
      .select("id")
      .eq("pagamento_id", pagamentoData.pagamento_id)
      .order("vencimento", { ascending: true });

    for (const parcela of parcelas!.slice(0, 2)) {
      const { data: resultado, error } = await client.rpc(
        "marcar_parcela_paga",
        { p_parcela_id: parcela.id },
      );
      expect(error).toBeNull();
      expect(resultado.pagamento_quitado).toBe(false);
    }

    const ultima = parcelas![2];
    const { data: resultadoFinal, error } = await client.rpc(
      "marcar_parcela_paga",
      { p_parcela_id: ultima.id },
    );
    expect(error).toBeNull();
    expect(resultadoFinal.pagamento_quitado).toBe(true);

    const { data: pagamento } = await client
      .from("pagamentos")
      .select("status")
      .eq("id", pagamentoData.pagamento_id)
      .single();
    expect(pagamento!.status).toBe("pago");
  });

  it("registrar_pagamento com valor menor que o total mantém a comanda aberta", async () => {
    const comandaId = await criarComanda(200);

    const { data, error } = await client.rpc("registrar_pagamento", {
      p_comanda_id: comandaId,
      p_forma_pagamento: "Dinheiro",
      p_valor: 50,
      p_num_parcelas: 1,
    });

    expect(error).toBeNull();
    expect(data.cobre_total).toBe(false);

    const { data: comanda } = await client
      .from("comandas")
      .select("status")
      .eq("id", comandaId)
      .single();
    expect(comanda!.status).toBe("aberta");
  });
});
