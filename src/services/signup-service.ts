import { addDays } from "date-fns";
import { UserRole } from "@prisma/client";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { createDefaultWeeklySchedule } from "@/lib/schedule";
import { auditLogRepository } from "@/repositories/audit-log-repository";

type SignupPayload = {
  organizationName: string;
  legalName?: string;
  documentNumber?: string;
  adminName: string;
  adminEmail: string;
  password: string;
  employeeEstimate: number;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function buildUniqueSlug(baseName: string) {
  const baseSlug = slugify(baseName) || "pointer-org";
  let slug = baseSlug;
  let attempt = 1;

  while (await db.organization.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  return slug;
}

export const signupService = {
  async createTrialOrganization(payload: SignupPayload) {
    const existingUser = await db.user.findUnique({
      where: {
        email: payload.adminEmail,
      },
    });

    if (existingUser) {
      throw new Error("Ja existe uma conta com este e-mail.");
    }

    const slug = await buildUniqueSlug(payload.organizationName);
    const passwordHash = await hashPassword(payload.password);
    const maxEmployees = payload.employeeEstimate <= 25 ? 25 : payload.employeeEstimate <= 100 ? 100 : 300;

    const result = await db.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: payload.organizationName,
          slug,
          legalName: payload.legalName || null,
          documentNumber: payload.documentNumber || null,
          contactEmail: payload.adminEmail,
          status: "TRIAL",
          plan: "STARTER",
          maxEmployees,
          trialEndsAt: addDays(new Date(), 14),
          timezone: "America/Sao_Paulo",
        },
      });

      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          name: payload.adminName,
          email: payload.adminEmail,
          passwordHash,
          mustChangePassword: false,
          role: UserRole.ADMIN,
          isActive: true,
          schedule: {
            create: {
              expectedStartTime: "09:00",
              expectedEndTime: "18:00",
              breakMinMinutes: 60,
              lateToleranceMinutes: 10,
              dailyWorkloadMinutes: 480,
              weekdays: {
                create: createDefaultWeeklySchedule().map((day) => ({
                  weekday: day.weekday,
                  isWorkingDay: day.isWorkingDay,
                  startTime: day.startTime,
                  endTime: day.endTime,
                  breakMinMinutes: day.breakMinMinutes,
                  dailyWorkloadMinutes: day.dailyWorkloadMinutes,
                })),
              },
            },
          },
        },
      });

      return { organization, user };
    });

    await createSession({
      sub: result.user.id,
      role: result.user.role,
      organizationId: result.organization.id,
      organizationSlug: result.organization.slug,
      name: result.user.name,
      email: result.user.email,
      mustChangePassword: false,
    });

    await auditLogRepository.create({
      organizationId: result.organization.id,
      actorUserId: result.user.id,
      action: "organization_trial_created",
      targetType: "organization",
      targetId: result.organization.id,
      metadataJson: {
        plan: result.organization.plan,
        slug: result.organization.slug,
      },
    });

    return result;
  },
};
