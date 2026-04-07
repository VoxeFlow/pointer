import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { auditLogRepository } from "@/repositories/audit-log-repository";
import { commercialSettingsSchema } from "@/validations/settings";

export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const payload = commercialSettingsSchema.parse(await request.json());
    const currentEmployees = await db.user.count({
      where: {
        organizationId: session.organizationId,
        role: "EMPLOYEE",
      },
    });

    if (payload.maxEmployees < currentEmployees) {
      return NextResponse.json(
        {
          error: `A capacidade nao pode ser menor que a quantidade atual de funcionarios (${currentEmployees}).`,
        },
        { status: 400 },
      );
    }

    const organization = await db.organization.update({
      where: { id: session.organizationId },
      data: {
        status: payload.status,
        plan: payload.plan,
        maxEmployees: payload.maxEmployees,
      },
    });

    await auditLogRepository.create({
      organizationId: session.organizationId,
      actorUserId: session.sub,
      action: "organization_commercial_settings_updated",
      targetType: "organization",
      targetId: organization.id,
      metadataJson: {
        status: organization.status,
        plan: organization.plan,
        maxEmployees: organization.maxEmployees,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nao foi possivel salvar os dados comerciais.",
      },
      { status: 400 },
    );
  }
}
