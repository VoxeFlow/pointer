import { NextResponse } from "next/server";
import { OrganizationPlan } from "@prisma/client";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { billingService } from "@/services/billing-service";

const schema = z.object({
  desiredPlan: z.nativeEnum(OrganizationPlan),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const payload = schema.parse(await request.json());
    const url = await billingService.createCheckoutSession({
      organizationId: session.organizationId,
      actorUserId: session.sub,
      desiredPlan: payload.desiredPlan,
    });

    return NextResponse.json({ success: true, url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao criar checkout." },
      { status: 400 },
    );
  }
}
