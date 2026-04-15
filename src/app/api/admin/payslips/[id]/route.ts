import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { auditLogRepository } from "@/repositories/audit-log-repository";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const { id } = await params;
    const payload = (await request.json().catch(() => ({}))) as { action?: string };
    const action = payload.action ?? "publish";

    const payslip = await db.payslip.findFirst({
      where: { id, organizationId: session.organizationId },
      select: { id: true, status: true, userId: true, competenceMonth: true, competenceYear: true },
    });

    if (!payslip) {
      return NextResponse.json({ error: "Contracheque não encontrado." }, { status: 404 });
    }

    if (action !== "publish") {
      return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
    }

    const updated = await db.payslip.update({
      where: { id: payslip.id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
      select: { id: true, status: true },
    });

    await auditLogRepository.create({
      organizationId: session.organizationId,
      actorUserId: session.sub,
      action: "payslip_published",
      targetType: "payslip",
      targetId: payslip.id,
      metadataJson: {
        sourceStatus: payslip.status,
        userId: payslip.userId,
        competenceMonth: payslip.competenceMonth,
        competenceYear: payslip.competenceYear,
      },
    });

    return NextResponse.json({ success: true, id: updated.id, status: updated.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível atualizar o contracheque." },
      { status: 400 },
    );
  }
}
