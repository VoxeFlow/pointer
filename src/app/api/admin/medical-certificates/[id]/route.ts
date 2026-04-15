import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { auditLogRepository } from "@/repositories/audit-log-repository";

type CertificateStatus = "REVIEWED" | "ACCEPTED" | "REJECTED";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();

    if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as { status?: CertificateStatus; reviewNote?: string };

    if (!body.status || !["REVIEWED", "ACCEPTED", "REJECTED"].includes(body.status)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }

    const certificate = await db.medicalCertificate.findFirst({
      where: { id, organizationId: session.organizationId },
      select: { id: true },
    });

    if (!certificate) {
      return NextResponse.json({ error: "Atestado não encontrado." }, { status: 404 });
    }

    await db.medicalCertificate.update({
      where: { id: certificate.id },
      data: {
        status: body.status,
        reviewNote: body.reviewNote?.trim() || null,
        reviewedById: session.sub,
      },
    });

    await auditLogRepository.create({
      organizationId: session.organizationId,
      actorUserId: session.sub,
      action: "medical_certificate_reviewed",
      targetType: "medical_certificate",
      targetId: certificate.id,
      metadataJson: {
        status: body.status,
        reviewNote: body.reviewNote?.trim() || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel revisar o atestado." },
      { status: 400 },
    );
  }
}
