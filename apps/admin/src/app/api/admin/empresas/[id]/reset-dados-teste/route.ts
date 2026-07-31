import { NextResponse } from "next/server";
import { createClient } from "@empresa/supabase/server";
import { createAdminClient } from "@empresa/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("perfil")
    .eq("id", user.id)
    .maybeSingle();

  if (usuario?.perfil !== "super_admin") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: empresa, error: empresaError } = await admin
    .from("empresas")
    .select("id, is_teste")
    .eq("id", id)
    .maybeSingle();

  if (empresaError || !empresa) {
    return NextResponse.json(
      { error: "Empresa não encontrada." },
      { status: 404 },
    );
  }

  if (!empresa.is_teste) {
    return NextResponse.json(
      { error: "Só é possível limpar dados de empresas marcadas como teste." },
      { status: 400 },
    );
  }

  // Ordem respeita FKs internas entre tabelas de negócio (filhas antes das mães).
  const tabelas: { schema?: "estetica"; nome: string }[] = [
    { schema: "estetica", nome: "anamnese_estetica_contraindicacao" },
    { schema: "estetica", nome: "anamnese_estetica" },
    { nome: "pacote_sessao_consumos" },
    { nome: "pacotes_sessao" },
    { nome: "plano_tratamento_etapas" },
    { nome: "planos_tratamento" },
    { nome: "fotos_atendimento" },
    { nome: "evolucoes" },
    { nome: "parcelas" },
    { nome: "pagamentos" },
    { nome: "comanda_itens" },
    { nome: "comandas" },
    { nome: "atendimentos" },
    { nome: "anamneses" },
    { nome: "prontuarios" },
    { nome: "agendamentos" },
    { nome: "procedimentos" },
    { nome: "salas" },
    { nome: "pacientes" },
  ];

  for (const { schema, nome } of tabelas) {
    const query = schema ? admin.schema(schema).from(nome) : admin.from(nome);
    const { error } = await query.delete().eq("empresa_id", id);
    if (error) {
      return NextResponse.json(
        { error: `Falha ao limpar "${nome}": ${error.message}` },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
