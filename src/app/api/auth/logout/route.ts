import { NextResponse } from "next/server";

import { clearSession, getSession } from "@/lib/auth/session";
import { getRequestOrigin } from "@/lib/http";
import { auditLogRepository } from "@/repositories/audit-log-repository";

export async function POST(request: Request) {
  const session = await getSession();

  if (session) {
    await auditLogRepository.create({
      organizationId: session.organizationId,
      actorUserId: session.sub,
      action: "logout",
      targetType: "session",
      targetId: session.sub,
    });
  }

  await clearSession();

  return NextResponse.redirect(new URL("/login", getRequestOrigin(request)), { status: 303 });
}
