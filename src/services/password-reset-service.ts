import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { auditLogRepository } from "@/repositories/audit-log-repository";

export const passwordResetService = {
  async completeFirstAccess(userId: string, password: string) {
    const passwordHash = await hashPassword(password);

    const user = await db.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
      include: {
        organization: true,
      },
    });

    await createSession({
      sub: user.id,
      role: user.role,
      organizationId: user.organizationId,
      organizationSlug: user.organization.slug,
      name: user.name,
      email: user.email,
      mustChangePassword: false,
    });

    await auditLogRepository.create({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "first_access_password_changed",
      targetType: "user",
      targetId: user.id,
    });

    return user;
  },
};
