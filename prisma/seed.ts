import { hash } from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";
import { addDays } from "date-fns";

import { createDefaultWeeklySchedule } from "../src/lib/schedule";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.POINTER_ADMIN_EMAIL ?? "admin@pointer.local";
  const adminPassword = process.env.POINTER_ADMIN_PASSWORD ?? "ChangeMe123!";
  const adminName = process.env.POINTER_ADMIN_NAME ?? "Admin Pointer";

  const organization = await prisma.organization.upsert({
    where: { slug: "pointer-main" },
    update: {},
    create: {
      name: "Pointer",
      slug: "pointer-main",
      legalName: "Pointer Tecnologia Ltda",
      contactEmail: adminEmail,
      status: "TRIAL",
      plan: "STARTER",
      maxEmployees: 25,
      trialEndsAt: addDays(new Date(), 14),
      timezone: "America/Sao_Paulo",
      accountantReportEmail: null,
      monthlyReportEnabled: false,
    },
  });

  const passwordHash = await hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      passwordHash,
      mustChangePassword: false,
      role: UserRole.ADMIN,
      organizationId: organization.id,
      isActive: true,
    },
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash,
      mustChangePassword: false,
      role: UserRole.ADMIN,
      organizationId: organization.id,
      isActive: true,
    },
  });

  await prisma.workSchedule.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
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
  });

  console.log("Seed concluido:", {
    organization: organization.name,
    adminEmail,
    adminPassword,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
