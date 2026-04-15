import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { IMAGE_CONSENT_VERSION } from "@/lib/consent";
import { auditLogRepository } from "@/repositories/audit-log-repository";

const imageConsentSchema = z.object({
  accepted: z.boolean(),
});

export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "EMPLOYEE") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const payload = imageConsentSchema.parse(await request.json());
    const now = new Date();

    const user = await db.user.update({
      where: { id: session.sub },
      data: payload.accepted
        ? {
            imageConsentAcceptedAt: now,
            imageConsentVersion: IMAGE_CONSENT_VERSION,
          }
        : {
            imageConsentRevokedAt: now,
          },
      select: {
        imageConsentAcceptedAt: true,
        imageConsentRevokedAt: true,
        imageConsentVersion: true,
      },
    });

    await auditLogRepository.create({
      organizationId: session.organizationId,
      actorUserId: session.sub,
      action: payload.accepted ? "image_consent_accepted" : "image_consent_revoked",
      targetType: "user",
      targetId: session.sub,
      metadataJson: {
        version: IMAGE_CONSENT_VERSION,
      },
    });

    return NextResponse.json({
      success: true,
      consent: {
        acceptedAt: user.imageConsentAcceptedAt?.toISOString() ?? null,
        revokedAt: user.imageConsentRevokedAt?.toISOString() ?? null,
        version: user.imageConsentVersion ?? null,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Nao foi possivel validar a autorizacao de imagem." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel atualizar a autorizacao de imagem." },
      { status: 400 },
    );
  }
}
