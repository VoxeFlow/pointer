import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { billingService } from "@/services/billing-service";

export async function POST() {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const url = await billingService.createBillingPortalSession({
      organizationId: session.organizationId,
      actorUserId: session.sub,
    });

    return NextResponse.json({ success: true, url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao abrir portal." },
      { status: 400 },
    );
  }
}
