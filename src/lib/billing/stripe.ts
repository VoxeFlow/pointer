import Stripe from "stripe";
import { OrganizationPlan } from "@prisma/client";

import { env } from "@/lib/env";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (!env.POINTER_STRIPE_SECRET_KEY) {
    throw new Error("Stripe do Pointer nao configurado. Use chaves exclusivas deste projeto.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.POINTER_STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

export function getStripePriceId(plan: OrganizationPlan) {
  const priceMap: Record<OrganizationPlan, string | undefined> = {
    STARTER: env.POINTER_STRIPE_PRICE_STARTER,
    PRO: env.POINTER_STRIPE_PRICE_PRO,
    ENTERPRISE: env.POINTER_STRIPE_PRICE_ENTERPRISE,
  };

  const priceId = priceMap[plan];

  if (!priceId) {
    throw new Error(`Preco Stripe nao configurado para o plano ${plan}.`);
  }

  return priceId;
}
