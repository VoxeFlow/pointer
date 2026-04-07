import { z } from "zod";

import { weekdayValues, type WeekdayValue } from "@/lib/schedule";

const weekdayScheduleSchema = z.object({
  weekday: z.enum(weekdayValues),
  isWorkingDay: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  breakMinMinutes: z.number().int().min(0).max(240),
  dailyWorkloadMinutes: z.number().int().min(0).max(960),
});

const weekdayOrder: WeekdayValue[] = [...weekdayValues];

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function validateWeeklySchedule(
  weeklySchedule: z.infer<typeof weekdayScheduleSchema>[],
  ctx: z.RefinementCtx,
) {
  const ordered = [...weeklySchedule].sort(
    (left, right) => weekdayOrder.indexOf(left.weekday) - weekdayOrder.indexOf(right.weekday),
  );

  const workedDays = ordered.filter((day) => day.isWorkingDay);
  const totalWeeklyMinutes = workedDays.reduce((sum, day) => sum + day.dailyWorkloadMinutes, 0);

  if (workedDays.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["weeklySchedule"],
      message: "Configure pelo menos um dia de trabalho na semana.",
    });
  }

  if (totalWeeklyMinutes > 44 * 60) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["weeklySchedule"],
      message: "A jornada semanal ultrapassa 44 horas. Para o MVP, o Pointer segue a regra geral da CLT.",
    });
  }

  for (const [index, day] of ordered.entries()) {
    if (!day.isWorkingDay) {
      continue;
    }

    if (!day.startTime || !day.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weeklySchedule", index],
        message: "Defina entrada e saída para todos os dias de trabalho.",
      });
      continue;
    }

    const start = toMinutes(day.startTime);
    const end = toMinutes(day.endTime);

    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weeklySchedule", index, "endTime"],
        message: "A saída deve ser após a entrada.",
      });
    }

    if (day.dailyWorkloadMinutes > 8 * 60) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weeklySchedule", index, "dailyWorkloadMinutes"],
        message: "A carga diária não pode ultrapassar 8 horas na regra geral do Pointer.",
      });
    }

    if (day.dailyWorkloadMinutes > 6 * 60 && day.breakMinMinutes < 60) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weeklySchedule", index, "breakMinMinutes"],
        message: "Para jornadas acima de 6 horas, informe ao menos 60 minutos de intervalo.",
      });
    }

    if (day.dailyWorkloadMinutes > 4 * 60 && day.dailyWorkloadMinutes <= 6 * 60 && day.breakMinMinutes < 15) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weeklySchedule", index, "breakMinMinutes"],
        message: "Para jornadas acima de 4 horas e até 6 horas, informe ao menos 15 minutos de intervalo.",
      });
    }

    if (day.breakMinMinutes > 120) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weeklySchedule", index, "breakMinMinutes"],
        message: "Use no máximo 120 minutos de intervalo na regra geral do Pointer.",
      });
    }
  }

  const workingSequence = ordered
    .map((day, index) => ({ day, index }))
    .filter(({ day }) => day.isWorkingDay && day.startTime && day.endTime);

  for (let i = 0; i < workingSequence.length; i += 1) {
    const current = workingSequence[i];
    const next = workingSequence[(i + 1) % workingSequence.length];

    if (!current || !next || current === next) {
      continue;
    }

    const currentEnd = toMinutes(current.day.endTime!);
    let nextStart = toMinutes(next.day.startTime!);
    const dayDistance =
      next.index > current.index ? next.index - current.index : 7 - current.index + next.index;

    nextStart += dayDistance * 24 * 60;

    if (nextStart - currentEnd < 11 * 60) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weeklySchedule", next.index, "startTime"],
        message: "Respeite pelo menos 11 horas entre o fim de um turno e o início do próximo.",
      });
    }
  }

  const hasDayOff = ordered.some((day) => !day.isWorkingDay);
  if (!hasDayOff) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["weeklySchedule"],
      message: "Configure ao menos uma folga semanal para atender a regra geral de descanso.",
    });
  }
}

const employeeSchemaBase = z.object({
  name: z.string().trim().min(3, "Informe o nome completo."),
  email: z.email("Informe um e-mail valido.").trim().toLowerCase(),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
  employeeCode: z.string().trim().max(32).optional().or(z.literal("")),
  expectedStartTime: z.string().regex(/^\d{2}:\d{2}$/, "Horario inicial invalido."),
  expectedEndTime: z.string().regex(/^\d{2}:\d{2}$/, "Horario final invalido."),
  breakMinMinutes: z.coerce.number().int().min(0).max(240),
  lateToleranceMinutes: z.coerce.number().int().min(0).max(120),
  dailyWorkloadMinutes: z.coerce.number().int().min(60).max(960),
  weeklySchedule: z.array(weekdayScheduleSchema).length(7),
});

export const createEmployeeSchema = employeeSchemaBase.superRefine((payload, ctx) => {
  validateWeeklySchedule(payload.weeklySchedule, ctx);
});

export const updateEmployeeSchema = employeeSchemaBase.extend({
  password: z.string().min(8).optional().or(z.literal("")),
  isActive: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true" || value === "on"),
}).superRefine((payload, ctx) => {
  validateWeeklySchedule(payload.weeklySchedule, ctx);
});
