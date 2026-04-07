"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";
import { orderedWeekdays, type WeekdayValue } from "@/lib/schedule";
import { adminUserService } from "@/services/admin-user-service";
import { createEmployeeSchema, updateEmployeeSchema } from "@/validations/admin-user";

function parseTimeToMinutes(value: string | null) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function calculateWorkload(startTime: string | null, endTime: string | null, breakMinMinutes: number, isWorkingDay: boolean) {
  if (!isWorkingDay) {
    return 0;
  }

  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);

  if (start === null || end === null || end <= start) {
    return 0;
  }

  return Math.max(0, end - start - breakMinMinutes);
}

function buildPayload(formData: FormData) {
  const weeklySchedule = orderedWeekdays.map((weekday) => {
    const isWorkingDay = formData.get(`${weekday}_isWorkingDay`) === "on";
    const startTime = String(formData.get(`${weekday}_startTime`) ?? "") || null;
    const endTime = String(formData.get(`${weekday}_endTime`) ?? "") || null;
    const breakMinMinutes = Number(formData.get(`${weekday}_breakMinMinutes`) ?? 0);
    const dailyWorkloadMinutes = calculateWorkload(startTime, endTime, breakMinMinutes, isWorkingDay);

    return {
      weekday: weekday as WeekdayValue,
      isWorkingDay,
      startTime: isWorkingDay ? startTime : null,
      endTime: isWorkingDay ? endTime : null,
      breakMinMinutes: isWorkingDay ? breakMinMinutes : 0,
      dailyWorkloadMinutes: isWorkingDay ? dailyWorkloadMinutes : 0,
    };
  });

  const firstWorkingDay = weeklySchedule.find((day) => day.isWorkingDay && day.startTime && day.endTime);

  return {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    employeeCode: String(formData.get("employeeCode") ?? ""),
    password: String(formData.get("password") ?? ""),
    lateToleranceMinutes: Number(formData.get("lateToleranceMinutes") ?? 0),
    isActive: formData.get("isActive") === "on",
    expectedStartTime: firstWorkingDay?.startTime ?? "09:00",
    expectedEndTime: firstWorkingDay?.endTime ?? "18:00",
    breakMinMinutes: firstWorkingDay?.breakMinMinutes ?? 60,
    dailyWorkloadMinutes: firstWorkingDay?.dailyWorkloadMinutes ?? 480,
    weeklySchedule,
  };
}

export async function createEmployeeAction(formData: FormData) {
  const session = await requireRole("ADMIN");

  try {
    const payload = createEmployeeSchema.parse(buildPayload(formData));
    const employee = await adminUserService.createEmployee({
      actorUserId: session.sub,
      organizationId: session.organizationId,
      ...payload,
    });

    revalidatePath("/admin/employees");
    const destination = `/admin/employees/${employee.id}?created=1`;
    redirect(destination);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel cadastrar o funcionario.";
    if (message === "NEXT_REDIRECT") {
      throw error;
    }
    redirect(`/admin/employees?error=${encodeURIComponent(message)}`);
  }
}

export async function updateEmployeeAction(employeeId: string, formData: FormData) {
  const session = await requireRole("ADMIN");

  try {
    const payload = updateEmployeeSchema.parse(buildPayload(formData));
    const employee = await adminUserService.updateEmployee(employeeId, {
      actorUserId: session.sub,
      organizationId: session.organizationId,
      ...payload,
      password: payload.password || undefined,
    });

    revalidatePath("/admin/employees");
    revalidatePath(`/admin/employees/${employee.id}`);
    const destination = `/admin/employees/${employee.id}?saved=1`;
    redirect(destination);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel atualizar o funcionario.";
    if (message === "NEXT_REDIRECT") {
      throw error;
    }
    redirect(`/admin/employees/${employeeId}?error=${encodeURIComponent(message)}`);
  }
}
