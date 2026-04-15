import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { DEVICE_CONSENT_VERSION } from "@/lib/consent";
import { auditLogRepository } from "@/repositories/audit-log-repository";

const deviceConsentSchema = z.object({
  accepted: z.boolean(),
});

export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "EMPLOYEE") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const payload = deviceConsentSchema.parse(await request.json());
    const now = new Date();

    const user = await db.user.update({
      where: { id: session.sub },
      data: payload.accepted
        ? {
            deviceConsentAcceptedAt: now,
            deviceConsentVersion: DEVICE_CONSENT_VERSION,
          }
        : {
            deviceConsentRevokedAt: now,
          },
      select: {
        deviceConsentAcceptedAt: true,
        deviceConsentRevokedAt: true,
        deviceConsentVersion: true,
      },
    });

    await auditLogRepository.create({
      organizationId: session.organizationId,
      actorUserId: session.sub,
      action: payload.accepted ? "device_consent_accepted" : "device_consent_revoked",
      targetType: "user",
      targetId: session.sub,
      metadataJson: {
        version: DEVICE_CONSENT_VERSION,
      },
    });

    return NextResponse.json({
      success: true,
      consent: {
        acceptedAt: user.deviceConsentAcceptedAt?.toISOString() ?? null,
        revokedAt: user.deviceConsentRevokedAt?.toISOString() ?? null,
        version: user.deviceConsentVersion ?? null,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Nao foi possivel validar o consentimento." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel atualizar o consentimento." },
      { status: 400 },
    );
  }
}
