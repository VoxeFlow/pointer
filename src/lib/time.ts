import { RecordType, type TimeRecord, type WorkSchedule, type WorkScheduleDay } from "@prisma/client";
import {
  differenceInMinutes,
  endOfDay,
  isSameDay,
  startOfDay,
} from "date-fns";

import { RECORD_SEQUENCE } from "@/lib/constants";
import { getDayWorkContext, getScheduleDayForDate } from "@/lib/schedule";

type ScheduleLike = {
  lateToleranceMinutes: number;
  weekdays?: Array<
    Pick<
      WorkScheduleDay,
      "weekday" | "isWorkingDay" | "startTime" | "endTime" | "breakMinMinutes" | "dailyWorkloadMinutes"
    >
  >;
} | null | undefined;

export type AttendanceIssue = {
  code: "MISSING_ENTRY" | "OVER_BREAK" | "MISSING_EXIT";
  severity: "warning" | "critical";
  title: string;
  description: string;
};

export function getDayRange(date = new Date()) {
  return {
    start: startOfDay(date),
    end: endOfDay(date),
  };
}

export function getBrasiliaDayBounds(date = new Date()) {
  const brtString = date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  const brtDate = new Date(brtString);
  
  const yyyy = brtDate.getFullYear();
  const mm = String(brtDate.getMonth() + 1).padStart(2, '0');
  const dd = String(brtDate.getDate()).padStart(2, '0');

  const start = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000-03:00`);
  const end = new Date(`${yyyy}-${mm}-${dd}T23:59:59.999-03:00`);
  
  return { start, end };
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

function parseTimeToMinutes(value?: string | null) {
  if (!value) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function getBrasiliaClockMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((accumulator, part) => {
      if (part.type !== "literal") {
        accumulator[part.type] = part.value;
      }

      return accumulator;
    }, {});

  return Number(parts.hour) * 60 + Number(parts.minute);
}

export function getRealtimeAttendanceIssue(
  records: Pick<TimeRecord, "recordType" | "serverTimestamp">[],
  schedule?: ScheduleLike,
  date = new Date(),
): AttendanceIssue | null {
  const dayContext = getDayWorkContext(schedule?.weekdays ?? [], date);

  if (!dayContext.isWorkingDay) {
    return null;
  }

  const nowMinutes = getBrasiliaClockMinutes(date);
  const expectedStartMinutes = parseTimeToMinutes(dayContext.expectedStartTime);
  const predictedEndMinutes = parseTimeToMinutes(dayContext.predictedEndTime ?? dayContext.expectedEndTime);
  const tolerance = schedule?.lateToleranceMinutes ?? 0;
  const lastRecord = records.at(-1);

  if (records.length === 0 && expectedStartMinutes !== null && nowMinutes >= expectedStartMinutes + tolerance) {
    return {
      code: "MISSING_ENTRY",
      severity: "critical",
      title: "Entrada pendente",
      description: "Sua jornada já começou e ainda não há registro de entrada neste horário.",
    };
  }

  if (lastRecord?.recordType === RecordType.BREAK_OUT) {
    const breakElapsed = Math.max(0, differenceInMinutes(date, lastRecord.serverTimestamp));

    if (breakElapsed >= dayContext.expectedBreakMinutes + 5) {
      return {
        code: "OVER_BREAK",
        severity: "warning",
        title: "Retorno do intervalo pendente",
        description: "O intervalo já passou do tempo previsto e o retorno ainda não foi registrado.",
      };
    }
  }

  if (
    (lastRecord?.recordType === RecordType.ENTRY || lastRecord?.recordType === RecordType.BREAK_IN) &&
    predictedEndMinutes !== null &&
    nowMinutes >= predictedEndMinutes + 5
  ) {
    return {
      code: "MISSING_EXIT",
      severity: "warning",
      title: "Saída pendente",
      description: "A jornada prevista já passou e falta registrar a saída final.",
    };
  }

  return null;
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
