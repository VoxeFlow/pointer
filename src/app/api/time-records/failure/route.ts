import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { auditLogRepository } from "@/repositories/audit-log-repository";

const clientFailureSchema = z.object({
  stage: z.string().min(1).max(60),
  code: z.string().max(80).optional(),
  message: z.string().max(500).optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const body = clientFailureSchema.parse(await request.json());
    const requestHeaders = await headers();

    await auditLogRepository.create({
      organizationId: session.organizationId,
      actorUserId: session.sub,
      action: "time_record_client_failure",
      targetType: "time_record_attempt",
      metadataJson: {
        ...body,
        userAgent: requestHeaders.get("user-agent"),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel registrar a falha." },
      { status: 400 },
    );
  }
}
