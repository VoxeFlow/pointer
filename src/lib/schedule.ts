export const weekdayValues = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export type WeekdayValue = (typeof weekdayValues)[number];

export const weekdayLabels: Record<WeekdayValue, string> = {
  MONDAY: "Segunda",
  TUESDAY: "Terça",
  WEDNESDAY: "Quarta",
  THURSDAY: "Quinta",
  FRIDAY: "Sexta",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

export const orderedWeekdays: WeekdayValue[] = [...weekdayValues];

export type WeeklyScheduleInput = {
  weekday: WeekdayValue;
  isWorkingDay: boolean;
  startTime: string | null;
  endTime: string | null;
  breakMinMinutes: number;
  dailyWorkloadMinutes: number;
};

type ScheduleDayLike = {
  weekday: WeekdayValue;
  isWorkingDay: boolean;
  startTime: string | null;
  endTime: string | null;
  breakMinMinutes: number;
  dailyWorkloadMinutes: number;
};

export function createDefaultWeeklySchedule() {
  return orderedWeekdays.map((weekday) => ({
    weekday,
    isWorkingDay: weekday !== "SATURDAY" && weekday !== "SUNDAY",
    startTime: weekday !== "SATURDAY" && weekday !== "SUNDAY" ? "09:00" : null,
    endTime: weekday !== "SATURDAY" && weekday !== "SUNDAY" ? "18:00" : null,
    breakMinMinutes: weekday !== "SATURDAY" && weekday !== "SUNDAY" ? 60 : 0,
    dailyWorkloadMinutes: weekday !== "SATURDAY" && weekday !== "SUNDAY" ? 480 : 0,
  }));
}

export function normalizeWeeklySchedule(
  weeklySchedule: WeeklyScheduleInput[] | null | undefined,
  fallback: {
    expectedStartTime: string;
    expectedEndTime: string;
    breakMinMinutes: number;
    dailyWorkloadMinutes: number;
  },
) {
  const byDay = new Map((weeklySchedule ?? []).map((item) => [item.weekday, item]));

  return orderedWeekdays.map((weekday) => {
    const current = byDay.get(weekday);

    if (current) {
      return {
        weekday,
        isWorkingDay: current.isWorkingDay,
        startTime: current.isWorkingDay ? current.startTime : null,
        endTime: current.isWorkingDay ? current.endTime : null,
        breakMinMinutes: current.isWorkingDay ? current.breakMinMinutes : 0,
        dailyWorkloadMinutes: current.isWorkingDay ? current.dailyWorkloadMinutes : 0,
      };
    }

    const isWorkingDay = weekday !== "SATURDAY" && weekday !== "SUNDAY";
    return {
      weekday,
      isWorkingDay,
      startTime: isWorkingDay ? fallback.expectedStartTime : null,
      endTime: isWorkingDay ? fallback.expectedEndTime : null,
      breakMinMinutes: isWorkingDay ? fallback.breakMinMinutes : 0,
      dailyWorkloadMinutes: isWorkingDay ? fallback.dailyWorkloadMinutes : 0,
    };
  });
}

export function getWeekdayFromDate(date: Date): WeekdayValue {
  return [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ][date.getDay()] as WeekdayValue;
}

export function getScheduleDayForDate(
  days: ScheduleDayLike[],
  date: Date,
) {
  const weekday = getWeekdayFromDate(date);
  return days.find((day) => day.weekday === weekday) ?? null;
}

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatMinutesToTime(value: number) {
  const normalized = ((value % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function getDayWorkContext(
  days: ScheduleDayLike[],
  date: Date,
) {
  const currentDay = getScheduleDayForDate(days, date);

  if (!currentDay || !currentDay.isWorkingDay || !currentDay.startTime || !currentDay.endTime) {
    return {
      isWorkingDay: false,
      label: "Folga",
      currentDay,
      expectedStartTime: null,
      expectedEndTime: null,
      expectedBreakMinutes: 0,
      expectedDailyWorkloadMinutes: 0,
      expectedSpanMinutes: 0,
    };
  }

  const startMinutes = parseTimeToMinutes(currentDay.startTime);
  const endMinutes = parseTimeToMinutes(currentDay.endTime);
  const spanMinutes = Math.max(0, endMinutes - startMinutes);
  const predictedEnd =
    currentDay.dailyWorkloadMinutes > 0
      ? formatMinutesToTime(startMinutes + currentDay.dailyWorkloadMinutes + currentDay.breakMinMinutes)
      : currentDay.endTime;

  return {
    isWorkingDay: true,
    label: `${currentDay.startTime} às ${currentDay.endTime}`,
    currentDay,
    expectedStartTime: currentDay.startTime,
    expectedEndTime: currentDay.endTime,
    predictedEndTime: predictedEnd,
    expectedBreakMinutes: currentDay.breakMinMinutes,
    expectedDailyWorkloadMinutes: currentDay.dailyWorkloadMinutes,
    expectedSpanMinutes: spanMinutes,
  };
}

export function summarizeWeeklySchedule(
  days: Pick<ScheduleDayLike, "weekday" | "isWorkingDay" | "startTime" | "endTime" | "dailyWorkloadMinutes">[],
) {
  return orderedWeekdays.map((weekday) => {
    const day = days.find((item) => item.weekday === weekday);
    const label = weekdayLabels[weekday];

    if (!day || !day.isWorkingDay) {
      return `${label}: folga`;
    }

    return `${label}: ${day.startTime} às ${day.endTime} (${day.dailyWorkloadMinutes / 60}h)`;
  });
}
