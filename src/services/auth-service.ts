import { userRepository } from "@/repositories/user-repository";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { auditLogRepository } from "@/repositories/audit-log-repository";

export const authService = {
  async login(email: string, password: string, tenantSlug?: string) {
    const user = tenantSlug
      ? await userRepository.findByEmailAndOrganizationSlug(email, tenantSlug)
      : await userRepository.findByEmail(email);

    if (!user || !user.isActive) {
      await auditLogRepository.create({
        action: "login_failed",
        targetType: "user",
        metadataJson: { email },
      });

      throw new Error("Credenciais invalidas ou usuario inativo.");
    }

    if (tenantSlug && user.organization.slug !== tenantSlug) {
      throw new Error("Este acesso nao pertence ao tenant informado.");
    }

    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      await auditLogRepository.create({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "login_failed",
        targetType: "user",
        targetId: user.id,
        metadataJson: { email },
      });

      throw new Error("Credenciais invalidas ou usuario inativo.");
    }

    if (user.organization.status === "SUSPENDED" && user.role !== "ADMIN") {
      await auditLogRepository.create({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "login_blocked_organization_suspended",
        targetType: "organization",
        targetId: user.organizationId,
      });

      throw new Error("Sua organizacao esta suspensa. Entre em contato com o suporte Pointer.");
    }

    await createSession({
      sub: user.id,
      role: user.role,
      organizationId: user.organizationId,
      organizationSlug: user.organization.slug,
      name: user.name,
      email: user.email,
      mustChangePassword: user.mustChangePassword,
    });

    await auditLogRepository.create({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "login_success",
      targetType: "session",
      targetId: user.id,
      metadataJson: { role: user.role },
    });

    return user;
  },
};
