import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { createTimeAdjustmentRequestSchema } from "@/validations/time-adjustment";

export async function POST(request: Request) {
  try {
    const session = await requireRole("EMPLOYEE");
    const payload = createTimeAdjustmentRequestSchema.parse(await request.json());

    const adjustment = await db.timeAdjustmentRequest.create({
      data: {
        organizationId: session.organizationId,
        userId: session.sub,
        requestedDate: new Date(`${payload.requestedDate}T12:00:00.000Z`),
        requestedTime: payload.requestedTime || null,
        requestedType: payload.requestedType ?? null,
        reason: payload.reason,
      },
    });

    await db.auditLog.create({
      data: {
        organizationId: session.organizationId,
        actorUserId: session.sub,
        action: "time_adjustment_request_created",
        targetType: "time_adjustment_request",
        targetId: adjustment.id,
        metadataJson: {
          requestedDate: payload.requestedDate,
          requestedTime: payload.requestedTime || null,
          requestedType: payload.requestedType ?? null,
        },
      },
    });

    return NextResponse.json({ success: true, id: adjustment.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel enviar a solicitacao.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
