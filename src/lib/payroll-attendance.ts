import { MedicalCertificateStatus, Weekday, type WorkScheduleDay } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";

import { calculateWorkedMinutes } from "@/lib/time";

const TZ = "America/Sao_Paulo";

type TimeRecordLite = {
  recordType: "ENTRY" | "BREAK_OUT" | "BREAK_IN" | "EXIT";
  serverTimestamp: Date;
};

type MedicalCertificateLite = {
  status: MedicalCertificateStatus;
  startDate: Date | null;
  endDate: Date | null;
};

type ScheduleDayLite = Pick<WorkScheduleDay, "weekday" | "isWorkingDay" | "dailyWorkloadMinutes" | "startTime">;

type ScheduleLite = {
  dailyWorkloadMinutes: number;
  lateToleranceMinutes: number;
  expectedStartTime: string;
  weekdays?: ScheduleDayLite[];
} | null;

export type PayrollAttendanceSummary = {
  expectedMinutesTotal: number;
  workedMinutesTotal: number;
  missingMinutesTotal: number;
  lateMinutesTotal: number;
  absentDays: number;
  partialMissingDays: number;
  justifiedAbsenceDays: number;
};

function weekdayFromDate(date: Date): Weekday {
  const isoWeekday = Number(formatInTimeZone(date, TZ, "i"));
  return (
    {
      1: Weekday.MONDAY,
      2: Weekday.TUESDAY,
      3: Weekday.WEDNESDAY,
      4: Weekday.THURSDAY,
      5: Weekday.FRIDAY,
      6: Weekday.SATURDAY,
      7: Weekday.SUNDAY,
    }[isoWeekday] ?? Weekday.MONDAY
  );
}

export function dayKey(date: Date) {
  return formatInTimeZone(date, TZ, "yyyy-MM-dd");
}

export function toDateInBrt(year: number, month: number, day: number, endOfDay = false) {
  const hh = endOfDay ? "23:59:59.999" : "00:00:00.000";
  return new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${hh}-03:00`);
}

function getExpectedMinutesForDay(
  weekdayScheduleMap: Map<Weekday, Pick<WorkScheduleDay, "isWorkingDay" | "dailyWorkloadMinutes">>,
  weekday: Weekday,
  fallbackMinutes: number,
) {
  const daySchedule = weekdayScheduleMap.get(weekday);
  if (!daySchedule) {
    const isWeekday = weekday !== Weekday.SATURDAY && weekday !== Weekday.SUNDAY;
    return { isWorkingDay: isWeekday, expectedMinutes: isWeekday ? fallbackMinutes : 0 };
  }

  if (!daySchedule.isWorkingDay) {
    return { isWorkingDay: false, expectedMinutes: 0 };
  }

  const expected = daySchedule.dailyWorkloadMinutes > 0 ? daySchedule.dailyWorkloadMinutes : fallbackMinutes;
  return { isWorkingDay: true, expectedMinutes: expected };
}

function parseTimeToMinutes(value?: string | null) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function getEntryLateMinutes(args: {
  entryTimestamp: Date;
  schedule: ScheduleLite;
  weekdaySchedule?: ScheduleDayLite;
}) {
  const { entryTimestamp, schedule, weekdaySchedule } = args;
  if (!schedule) return 0;
  const expectedStart = weekdaySchedule?.startTime ?? schedule.expectedStartTime;
  const expectedStartMinutes = parseTimeToMinutes(expectedStart);
  if (expectedStartMinutes === null) return 0;
  const entryHHmm = formatInTimeZone(entryTimestamp, TZ, "HH:mm");
  const entryMinutes = parseTimeToMinutes(entryHHmm);
  if (entryMinutes === null) return 0;
  return Math.max(0, entryMinutes - expectedStartMinutes - schedule.lateToleranceMinutes);
}

function buildJustifiedDayKeys(certificates: MedicalCertificateLite[]) {
  const justifiedDayKeys = new Set<string>();
  for (const certificate of certificates) {
    if (!certificate.startDate || !certificate.endDate) continue;
    if (
      certificate.status !== MedicalCertificateStatus.ACCEPTED &&
      certificate.status !== MedicalCertificateStatus.REVIEWED
    ) {
      continue;
    }
    let cursor = toDateInBrt(
      Number(formatInTimeZone(certificate.startDate, TZ, "yyyy")),
      Number(formatInTimeZone(certificate.startDate, TZ, "MM")),
      Number(formatInTimeZone(certificate.startDate, TZ, "dd")),
    );
    const finalDate = toDateInBrt(
      Number(formatInTimeZone(certificate.endDate, TZ, "yyyy")),
      Number(formatInTimeZone(certificate.endDate, TZ, "MM")),
      Number(formatInTimeZone(certificate.endDate, TZ, "dd")),
    );
    while (cursor.getTime() <= finalDate.getTime()) {
      justifiedDayKeys.add(dayKey(cursor));
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    }
  }
  return justifiedDayKeys;
}

export function calculatePayrollAttendanceSummary(args: {
  records: TimeRecordLite[];
  certificates: MedicalCertificateLite[];
  schedule: ScheduleLite;
  from: Date;
  to: Date;
  organizationDefaultDailyWorkloadMin: number;
}): PayrollAttendanceSummary {
  const { records, certificates, schedule, from, to, organizationDefaultDailyWorkloadMin } = args;

  const recordsByDay = new Map<string, TimeRecordLite[]>();
  for (const record of records) {
    const key = dayKey(record.serverTimestamp);
    if (!recordsByDay.has(key)) recordsByDay.set(key, []);
    recordsByDay.get(key)!.push(record);
  }

  const justifiedDayKeys = buildJustifiedDayKeys(certificates);

  const weekdayScheduleMap = new Map<Weekday, Pick<WorkScheduleDay, "isWorkingDay" | "dailyWorkloadMinutes">>();
  for (const day of schedule?.weekdays ?? []) {
    weekdayScheduleMap.set(day.weekday, {
      isWorkingDay: day.isWorkingDay,
      dailyWorkloadMinutes: day.dailyWorkloadMinutes,
    });
  }

  let absentDays = 0;
  let partialMissingDays = 0;
  let justifiedAbsenceDays = 0;
  let expectedMinutesTotal = 0;
  let workedMinutesTotal = 0;
  let missingMinutesTotal = 0;
  let lateMinutesTotal = 0;

  let cursor = new Date(from.getTime());
  while (cursor.getTime() <= to.getTime()) {
    const key = dayKey(cursor);
    const weekday = weekdayFromDate(cursor);
      const daySchedule = schedule?.weekdays?.find((item) => item.weekday === weekday);
      const { isWorkingDay, expectedMinutes } = getExpectedMinutesForDay(
        weekdayScheduleMap,
        weekday,
        schedule?.dailyWorkloadMinutes ?? organizationDefaultDailyWorkloadMin,
    );

    if (isWorkingDay && expectedMinutes > 0) {
      expectedMinutesTotal += expectedMinutes;
      const dayRecords = recordsByDay.get(key) ?? [];
      const hasJustification = justifiedDayKeys.has(key);

      if (dayRecords.length === 0) {
        if (hasJustification) {
          justifiedAbsenceDays += 1;
        } else {
          absentDays += 1;
          missingMinutesTotal += expectedMinutes;
        }
      } else {
        const worked = calculateWorkedMinutes(dayRecords);
        workedMinutesTotal += worked;
        const missing = Math.max(0, expectedMinutes - worked);
        if (missing > 0) {
          partialMissingDays += 1;
          missingMinutesTotal += missing;
        }
        const entry = dayRecords.find((record) => record.recordType === "ENTRY");
        if (entry) {
          lateMinutesTotal += getEntryLateMinutes({
            entryTimestamp: entry.serverTimestamp,
            schedule,
            weekdaySchedule: daySchedule,
          });
        }
      }
    }

    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  return {
    expectedMinutesTotal,
    workedMinutesTotal,
    missingMinutesTotal,
    lateMinutesTotal,
    absentDays,
    partialMissingDays,
    justifiedAbsenceDays,
  };
}

export function calculateSuggestedAbsenceDeduction(args: { salaryBase: number; missingMinutes: number }) {
  const { salaryBase, missingMinutes } = args;
  const hourlyRate = salaryBase > 0 ? salaryBase / 220 : 0;
  return Number((hourlyRate * (missingMinutes / 60)).toFixed(2));
}
