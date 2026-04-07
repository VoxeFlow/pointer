import { RecordType, type TimeRecord, type WorkSchedule, type WorkScheduleDay } from "@prisma/client";
import {
  differenceInMinutes,
  endOfDay,
  format,
  isSameDay,
  startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import { RECORD_SEQUENCE } from "@/lib/constants";
import { getDayWorkContext, getScheduleDayForDate } from "@/lib/schedule";

export function getDayRange(date = new Date()) {
  return {
    start: startOfDay(date),
    end: endOfDay(date),
  };
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export function formatTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export function getNextRecordType(records: Pick<TimeRecord, "recordType">[], maxRecords: number) {
  if (records.length >= maxRecords) {
    return null;
  }

  return (RECORD_SEQUENCE[records.length] as RecordType | undefined) ?? null;
}

export function calculateWorkedMinutes(records: Pick<TimeRecord, "recordType" | "serverTimestamp">[]) {
  const sorted = [...records].sort(
    (current, next) => current.serverTimestamp.getTime() - next.serverTimestamp.getTime(),
  );

  let totalMinutes = 0;
  let entryTime: Date | null = null;

  for (const record of sorted) {
    if (record.recordType === RecordType.ENTRY || record.recordType === RecordType.BREAK_IN) {
      entryTime = record.serverTimestamp;
    }

    if ((record.recordType === RecordType.BREAK_OUT || record.recordType === RecordType.EXIT) && entryTime) {
      totalMinutes += Math.max(0, differenceInMinutes(record.serverTimestamp, entryTime));
      entryTime = null;
    }
  }

  return totalMinutes;
}

export function getDailyBalanceSummary(
  records: Pick<TimeRecord, "recordType" | "serverTimestamp">[],
  expectedDailyWorkloadMinutes: number,
) {
  const workedMinutes = calculateWorkedMinutes(records);
  const extraMinutes = Math.max(0, workedMinutes - expectedDailyWorkloadMinutes);
  const missingMinutes = Math.max(0, expectedDailyWorkloadMinutes - workedMinutes);

  return {
    workedMinutes,
    extraMinutes,
    missingMinutes,
  };
}

export function getJourneyStatus(records: Pick<TimeRecord, "recordType">[]) {
  const last = records.at(-1);

  if (!last) {
    return "Aguardando entrada";
  }

  if (last.recordType === RecordType.BREAK_OUT) {
    return "Em intervalo";
  }

  if (last.recordType === RecordType.EXIT) {
    return "Encerrado";
  }

  return "Em jornada";
}

export function getDynamicPredictedExitTime(
  records: Pick<TimeRecord, "recordType" | "serverTimestamp">[],
  options: {
    expectedDailyWorkloadMinutes: number;
    expectedBreakMinutes: number;
    scheduledPredictedEndTime?: string | null;
    now?: Date;
  },
) {
  const now = options.now ?? new Date();
  const { workedMinutes, missingMinutes } = getDailyBalanceSummary(records, options.expectedDailyWorkloadMinutes);
  const last = records.at(-1);

  if (!last) {
    return options.scheduledPredictedEndTime ?? null;
  }

  if (last.recordType === RecordType.EXIT) {
    return formatTime(last.serverTimestamp);
  }

  if (missingMinutes <= 0) {
    return "Pode encerrar";
  }

  if (last.recordType === RecordType.BREAK_OUT) {
    const breakElapsed = Math.max(0, differenceInMinutes(now, last.serverTimestamp));
    const remainingBreak = Math.max(0, options.expectedBreakMinutes - breakElapsed);
    return formatTime(new Date(now.getTime() + (missingMinutes + remainingBreak) * 60 * 1000));
  }

  if (last.recordType === RecordType.ENTRY || last.recordType === RecordType.BREAK_IN) {
    return formatTime(new Date(now.getTime() + missingMinutes * 60 * 1000));
  }

  if (workedMinutes > 0) {
    return formatTime(new Date(now.getTime() + missingMinutes * 60 * 1000));
  }

  return options.scheduledPredictedEndTime ?? null;
}

export function getTodayWorkSummary(
  records: Pick<TimeRecord, "recordType" | "serverTimestamp">[],
  schedule?: (WorkSchedule & { weekdays?: WorkScheduleDay[] }) | null,
  date = new Date(),
) {
  const dayContext = getDayWorkContext(schedule?.weekdays ?? [], date);
  const balance = getDailyBalanceSummary(records, dayContext.expectedDailyWorkloadMinutes);

  return {
    ...dayContext,
    ...balance,
    journeyStatus: getJourneyStatus(records),
    predictedExitTime: dayContext.isWorkingDay
      ? getDynamicPredictedExitTime(records, {
          expectedDailyWorkloadMinutes: dayContext.expectedDailyWorkloadMinutes,
          expectedBreakMinutes: dayContext.expectedBreakMinutes,
          scheduledPredictedEndTime: dayContext.predictedEndTime ?? dayContext.expectedEndTime ?? null,
          now: date,
        })
      : null,
  };
}

export function getLateMinutes(
  records: Pick<TimeRecord, "recordType" | "serverTimestamp">[],
  schedule?: (WorkSchedule & { weekdays?: WorkScheduleDay[] }) | null,
) {
  if (!schedule) {
    return 0;
  }

  const entry = records.find((record) => record.recordType === RecordType.ENTRY);

  if (!entry) {
    return 0;
  }

  const daySchedule = schedule.weekdays?.length ? getScheduleDayForDate(schedule.weekdays, entry.serverTimestamp) : null;
  const expectedStart = daySchedule?.isWorkingDay && daySchedule.startTime ? daySchedule.startTime : schedule.expectedStartTime;
  const [hours, minutes] = expectedStart.split(":").map(Number);
  const expectedDate = new Date(entry.serverTimestamp);
  expectedDate.setHours(hours, minutes, 0, 0);

  const diff = differenceInMinutes(entry.serverTimestamp, expectedDate) - schedule.lateToleranceMinutes;
  return Math.max(0, diff);
}

export function buildTimelineLabel(recordType: RecordType) {
  return {
    [RecordType.ENTRY]: "Entrada",
    [RecordType.BREAK_OUT]: "Saida para intervalo",
    [RecordType.BREAK_IN]: "Retorno do intervalo",
    [RecordType.EXIT]: "Saida final",
  }[recordType];
}

export function countPresentEmployees<T extends { timeRecords: { serverTimestamp: Date }[] }>(users: T[]) {
  return users.filter((user) =>
    user.timeRecords.some((record) => isSameDay(record.serverTimestamp, new Date())),
  ).length;
}
