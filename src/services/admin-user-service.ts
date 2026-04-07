import { UserRole } from "@prisma/client";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { auditLogRepository } from "@/repositories/audit-log-repository";

type EmployeePayload = {
  actorUserId: string;
  organizationId: string;
  name: string;
  email: string;
  password?: string;
  employeeCode?: string;
  expectedStartTime: string;
  expectedEndTime: string;
  breakMinMinutes: number;
  lateToleranceMinutes: number;
  dailyWorkloadMinutes: number;
  weeklySchedule: {
    weekday: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
    isWorkingDay: boolean;
    startTime: string | null;
    endTime: string | null;
    breakMinMinutes: number;
    dailyWorkloadMinutes: number;
  }[];
  isActive?: boolean;
};

export const adminUserService = {
  async createEmployee(payload: EmployeePayload) {
    const [organization, employeesCount] = await Promise.all([
      db.organization.findUniqueOrThrow({
        where: { id: payload.organizationId },
      }),
      db.user.count({
        where: {
          organizationId: payload.organizationId,
          role: UserRole.EMPLOYEE,
        },
      }),
    ]);

    if (employeesCount >= organization.maxEmployees) {
      throw new Error(
        `Limite do plano atingido. Esta organizacao permite ate ${organization.maxEmployees} funcionarios no momento.`,
      );
    }

    const passwordHash = await hashPassword(payload.password ?? "ChangeMe123!");

    const user = await db.user.create({
      data: {
        organizationId: payload.organizationId,
        name: payload.name,
        email: payload.email,
        passwordHash,
        mustChangePassword: true,
        role: UserRole.EMPLOYEE,
        employeeCode: payload.employeeCode || null,
        isActive: true,
        schedule: {
          create: {
            expectedStartTime: payload.expectedStartTime,
            expectedEndTime: payload.expectedEndTime,
            breakMinMinutes: payload.breakMinMinutes,
            lateToleranceMinutes: payload.lateToleranceMinutes,
            dailyWorkloadMinutes: payload.dailyWorkloadMinutes,
            weekdays: {
              create: payload.weeklySchedule.map((day) => ({
                weekday: day.weekday,
                isWorkingDay: day.isWorkingDay,
                startTime: day.isWorkingDay ? day.startTime : null,
                endTime: day.isWorkingDay ? day.endTime : null,
                breakMinMinutes: day.isWorkingDay ? day.breakMinMinutes : 0,
                dailyWorkloadMinutes: day.isWorkingDay ? day.dailyWorkloadMinutes : 0,
              })),
            },
          },
        },
      },
    });

    await auditLogRepository.create({
      organizationId: payload.organizationId,
      actorUserId: payload.actorUserId,
      action: "employee_created",
      targetType: "user",
      targetId: user.id,
      metadataJson: {
        email: user.email,
      },
    });

    return user;
  },

  async updateEmployee(employeeId: string, payload: EmployeePayload) {
    const current = await db.user.findFirstOrThrow({
      where: {
        id: employeeId,
        organizationId: payload.organizationId,
        role: UserRole.EMPLOYEE,
      },
    });

    const updateData: {
      name: string;
      email: string;
      employeeCode: string | null;
      isActive: boolean;
      passwordHash?: string;
    } = {
      name: payload.name,
      email: payload.email,
      employeeCode: payload.employeeCode || null,
      isActive: payload.isActive ?? true,
    };

    if (payload.password) {
      updateData.passwordHash = await hashPassword(payload.password);
    }

    const user = await db.user.update({
      where: {
        id: current.id,
      },
      data: {
        ...updateData,
        ...(payload.password ? { mustChangePassword: true } : {}),
        schedule: {
          upsert: {
            update: {
              expectedStartTime: payload.expectedStartTime,
              expectedEndTime: payload.expectedEndTime,
              breakMinMinutes: payload.breakMinMinutes,
              lateToleranceMinutes: payload.lateToleranceMinutes,
              dailyWorkloadMinutes: payload.dailyWorkloadMinutes,
              weekdays: {
                deleteMany: {},
                create: payload.weeklySchedule.map((day) => ({
                  weekday: day.weekday,
                  isWorkingDay: day.isWorkingDay,
                  startTime: day.isWorkingDay ? day.startTime : null,
                  endTime: day.isWorkingDay ? day.endTime : null,
                  breakMinMinutes: day.isWorkingDay ? day.breakMinMinutes : 0,
                  dailyWorkloadMinutes: day.isWorkingDay ? day.dailyWorkloadMinutes : 0,
                })),
              },
            },
            create: {
              expectedStartTime: payload.expectedStartTime,
              expectedEndTime: payload.expectedEndTime,
              breakMinMinutes: payload.breakMinMinutes,
              lateToleranceMinutes: payload.lateToleranceMinutes,
              dailyWorkloadMinutes: payload.dailyWorkloadMinutes,
              weekdays: {
                create: payload.weeklySchedule.map((day) => ({
                  weekday: day.weekday,
                  isWorkingDay: day.isWorkingDay,
                  startTime: day.isWorkingDay ? day.startTime : null,
                  endTime: day.isWorkingDay ? day.endTime : null,
                  breakMinMinutes: day.isWorkingDay ? day.breakMinMinutes : 0,
                  dailyWorkloadMinutes: day.isWorkingDay ? day.dailyWorkloadMinutes : 0,
                })),
              },
            },
          },
        },
      },
    });

    await auditLogRepository.create({
      organizationId: payload.organizationId,
      actorUserId: payload.actorUserId,
      action: "employee_updated",
      targetType: "user",
      targetId: user.id,
      metadataJson: {
        email: user.email,
        isActive: user.isActive,
      },
    });

    return user;
  },

  async toggleEmployeeStatus(employeeId: string, actorUserId: string, organizationId: string) {
    const current = await db.user.findFirstOrThrow({
      where: {
        id: employeeId,
        organizationId,
        role: UserRole.EMPLOYEE,
      },
    });

    const updated = await db.user.update({
      where: { id: current.id },
      data: {
        isActive: !current.isActive,
      },
    });

    await auditLogRepository.create({
      organizationId,
      actorUserId,
      action: "employee_status_toggled",
      targetType: "user",
      targetId: updated.id,
      metadataJson: {
        isActive: updated.isActive,
      },
    });

    return updated;
  },
};
