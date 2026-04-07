import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { auditLogRepository } from "@/repositories/audit-log-repository";
import { upgradeRequestSchema } from "@/validations/upgrade-request";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const payload = upgradeRequestSchema.parse(await request.json());
    const organization = await db.organization.findUniqueOrThrow({
      where: { id: session.organizationId },
    });

    if (payload.desiredPlan === organization.plan) {
      return NextResponse.json({ error: "Escolha um plano diferente do atual." }, { status: 400 });
    }

    const latestOpen = await db.upgradeRequest.findFirst({
      where: {
        organizationId: session.organizationId,
        status: "OPEN",
      },
      orderBy: { createdAt: "desc" },
    });

    if (latestOpen) {
      return NextResponse.json(
        {
          error: "Ja existe uma solicitacao comercial aberta para esta organizacao.",
        },
        { status: 400 },
      );
    }

    const upgradeRequest = await db.upgradeRequest.create({
      data: {
        organizationId: session.organizationId,
        requestedById: session.sub,
        currentPlan: organization.plan,
        desiredPlan: payload.desiredPlan,
        message: payload.message || null,
      },
    });

    await auditLogRepository.create({
      organizationId: session.organizationId,
      actorUserId: session.sub,
      action: "upgrade_request_created",
      targetType: "upgrade_request",
      targetId: upgradeRequest.id,
      metadataJson: {
        currentPlan: organization.plan,
        desiredPlan: payload.desiredPlan,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nao foi possivel criar a solicitacao.",
      },
      { status: 400 },
    );
  }
}
