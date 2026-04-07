import { NextResponse } from "next/server";
import Stripe from "stripe";

import { env } from "@/lib/env";
import { getStripeClient } from "@/lib/billing/stripe";
import { billingService } from "@/services/billing-service";

export async function POST(request: Request) {
  if (!env.POINTER_STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook Stripe nao configurado." }, { status: 400 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Assinatura Stripe ausente." }, { status: 400 });
  }

  try {
    const stripe = getStripeClient();
    const payload = await request.text();
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      env.POINTER_STRIPE_WEBHOOK_SECRET,
    );

    await billingService.processStripeEvent(event as Stripe.Event);

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha no webhook Stripe." },
      { status: 400 },
    );
  }
}
