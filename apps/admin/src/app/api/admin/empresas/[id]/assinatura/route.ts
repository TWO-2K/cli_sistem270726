import { NextResponse } from "next/server";
import { createClient } from "@empresa/supabase/server";
import { createAdminClient } from "@empresa/supabase/admin";
import { criarClienteStripe } from "@/lib/stripe";

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
    .select("id, nome, stripe_customer_id")
    .eq("id", id)
    .maybeSingle();

  if (empresaError || !empresa) {
    return NextResponse.json(
      { error: "Empresa não encontrada." },
      { status: 404 },
    );
  }

  const stripe = criarClienteStripe();
  let clienteId = empresa.stripe_customer_id;

  if (!clienteId) {
    const { data: administrador } = await admin
      .from("usuarios")
      .select("email")
      .eq("empresa_id", empresa.id)
      .eq("perfil", "admin")
      .maybeSingle();

    try {
      const cliente = await stripe.customers.create({
        name: empresa.nome,
        email: administrador?.email,
      });
      clienteId = cliente.id;
      await admin
        .from("empresas")
        .update({ stripe_customer_id: clienteId })
        .eq("id", empresa.id);
    } catch {
      return NextResponse.json(
        { error: "Não foi possível criar o cliente de cobrança." },
        { status: 400 },
      );
    }
  }

  const origem = new URL(request.url).origin;

  const sessao = await stripe.checkout.sessions.create({
    customer: clienteId,
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${origem}/empresas/${id}?assinatura=ativada`,
    cancel_url: `${origem}/empresas/${id}?assinatura=cancelada`,
  });

  if (!sessao.url) {
    return NextResponse.json(
      { error: "Não foi possível iniciar a sessão de cobrança." },
      { status: 400 },
    );
  }

  return NextResponse.json({ url: sessao.url });
}
