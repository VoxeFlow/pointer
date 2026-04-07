import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

type CreateAuditLogInput = Prisma.AuditLogUncheckedCreateInput;

type AuditLogPayload = {
  organizationId?: string;
  actorUserId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadataJson?: Record<string, unknown>;
};

export const auditLogRepository = {
  create(data: AuditLogPayload) {
    return db.auditLog.create({
      data: data as CreateAuditLogInput,
    });
  },
};
