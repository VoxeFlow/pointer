import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { auditLogRepository } from "@/repositories/audit-log-repository";
import { organizationSettingsSchema } from "@/validations/settings";

export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const payload = organizationSettingsSchema.parse(await request.json());
    const organization = await db.organization.update({
      where: { id: session.organizationId },
      data: {
        accountantReportEmail: payload.accountantReportEmail || null,
        monthlyReportEnabled: payload.monthlyReportEnabled,
      },
    });

    await auditLogRepository.create({
      organizationId: session.organizationId,
      actorUserId: session.sub,
      action: "organization_settings_updated",
      targetType: "organization",
      targetId: organization.id,
      metadataJson: {
        accountantReportEmail: organization.accountantReportEmail ?? "",
        monthlyReportEnabled: organization.monthlyReportEnabled,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nao foi possivel salvar as configuracoes.",
      },
      { status: 400 },
    );
  }
}
