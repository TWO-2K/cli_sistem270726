import { NextResponse } from "next/server";
import { createAdminClient } from "@empresa/supabase/admin";
import { logger } from "@empresa/observability/logger";
import { criarClienteStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const corpoBruto = await request.text();
  const assinatura = request.headers.get("stripe-signature");

  if (!assinatura) {
    return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });
  }

  const stripe = criarClienteStripe();
  let evento;
  try {
    evento = stripe.webhooks.constructEvent(
      corpoBruto,
      assinatura,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (erro) {
    logger.error("webhook stripe: assinatura inválida", {
      error: erro instanceof Error ? erro.message : String(erro),
    });
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (evento.type) {
    case "checkout.session.completed": {
      const sessao = evento.data.object;
      const clienteId =
        typeof sessao.customer === "string" ? sessao.customer : sessao.customer?.id;
      const assinaturaId =
        typeof sessao.subscription === "string"
          ? sessao.subscription
          : sessao.subscription?.id;
      if (clienteId && assinaturaId) {
        await admin
          .from("empresas")
          .update({ stripe_subscription_id: assinaturaId })
          .eq("stripe_customer_id", clienteId);
      }
      break;
    }
    case "invoice.paid": {
      const fatura = evento.data.object;
      const clienteId =
        typeof fatura.customer === "string" ? fatura.customer : fatura.customer?.id;
      if (clienteId) {
        await admin
          .from("empresas")
          .update({ status: "ativa" })
          .eq("stripe_customer_id", clienteId);
      }
      break;
    }
    case "invoice.payment_failed":
    case "customer.subscription.deleted": {
      const objeto = evento.data.object;
      const clienteId =
        typeof objeto.customer === "string" ? objeto.customer : objeto.customer?.id;
      if (clienteId) {
        await admin
          .from("empresas")
          .update({ status: "suspensa" })
          .eq("stripe_customer_id", clienteId);
      }
      break;
    }
  }

  return NextResponse.json({ recebido: true });
}
