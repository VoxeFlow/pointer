import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { uploadDocument } from "@/lib/storage";
import { auditLogRepository } from "@/repositories/audit-log-repository";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "EMPLOYEE") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const issueDate = formData.get("issueDate")?.toString() || "";
    const startDate = formData.get("startDate")?.toString() || "";
    const endDate = formData.get("endDate")?.toString() || "";
    const notes = formData.get("notes")?.toString().trim() || "";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Anexe o atestado em PDF ou imagem." }, { status: 400 });
    }

    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "Envie o atestado em PDF, JPG, PNG ou WEBP." }, { status: 400 });
    }

    const upload = await uploadDocument(
      file,
      `medical-certificate-${session.organizationId}-${session.sub}-${randomUUID()}-${file.name}`,
    );

    const certificate = await db.medicalCertificate.create({
      data: {
        organizationId: session.organizationId,
        userId: session.sub,
        issueDate: issueDate ? new Date(`${issueDate}T12:00:00-03:00`) : null,
        startDate: startDate ? new Date(`${startDate}T12:00:00-03:00`) : null,
        endDate: endDate ? new Date(`${endDate}T12:00:00-03:00`) : null,
        notes: notes || null,
        fileUrl: upload.url,
        originalFileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    });

    await auditLogRepository.create({
      organizationId: session.organizationId,
      actorUserId: session.sub,
      action: "medical_certificate_submitted",
      targetType: "medical_certificate",
      targetId: certificate.id,
      metadataJson: {
        originalFileName: file.name,
        sizeBytes: file.size,
      },
    });

    return NextResponse.json({ success: true, id: certificate.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel enviar o atestado." },
      { status: 400 },
    );
  }
}
