import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { auditLogRepository } from "@/repositories/audit-log-repository";

export async function POST() {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const organization = await db.organization.update({
    where: { id: session.organizationId },
    data: {
      onboardingCompletedAt: new Date(),
    },
  });

  await auditLogRepository.create({
    organizationId: session.organizationId,
    actorUserId: session.sub,
    action: "organization_onboarding_completed",
    targetType: "organization",
    targetId: organization.id,
  });

  return NextResponse.json({ success: true });
}
