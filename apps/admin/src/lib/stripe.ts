import "server-only";
import Stripe from "stripe";

export function criarClienteStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}
