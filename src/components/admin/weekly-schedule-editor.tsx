"use client";

import { useMemo, useState } from "react";

import { orderedWeekdays, type WeeklyScheduleInput, weekdayLabels } from "@/lib/schedule";
import { formatMinutes } from "@/lib/utils";

function parseTimeToMinutes(value: string | null) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function calculateWorkload(day: Pick<WeeklyScheduleInput, "startTime" | "endTime" | "breakMinMinutes" | "isWorkingDay">) {
  if (!day.isWorkingDay) {
    return 0;
  }

  const start = parseTimeToMinutes(day.startTime);
  const end = parseTimeToMinutes(day.endTime);

  if (start === null || end === null || end <= start) {
    return 0;
  }

  return Math.max(0, end - start - day.breakMinMinutes);
}

export function WeeklyScheduleEditor({ defaults }: { defaults: WeeklyScheduleInput[] }) {
  const [weeklySchedule, setWeeklySchedule] = useState(defaults);
  const fallbackWorkingDay = defaults.find((day) => day.isWorkingDay) ?? defaults[0];
  const totalWeeklyMinutes = useMemo(
    () => weeklySchedule.reduce((sum, day) => sum + calculateWorkload(day), 0),
    [weeklySchedule],
  );

  function updateDay(weekday: WeeklyScheduleInput["weekday"], next: Partial<WeeklyScheduleInput>) {
    setWeeklySchedule((current) =>
      current.map((day) => (day.weekday === weekday ? { ...day, ...next } : day)),
    );
  }

  return (
    <section className="rounded-[1.25rem] border border-border bg-white/60 p-4">
      <div>
        <p className="text-sm font-semibold">Jornada por dia da semana</p>
      </div>

      <div className="mt-4 grid gap-3">
        {orderedWeekdays.map((weekday) => {
          const day = weeklySchedule.find((item) => item.weekday === weekday) ?? defaults.find((item) => item.weekday === weekday)!;
          const workload = calculateWorkload(day);

          return (
            <div key={weekday} className="rounded-[1rem] border border-border/80 bg-white px-4 py-4">
              <input type="hidden" name={`${weekday}_weekday`} value={weekday} />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{weekdayLabels[weekday]}</p>
                  <p className="text-xs text-muted">
                    {day.isWorkingDay ? `${day.startTime ?? "--:--"} às ${day.endTime ?? "--:--"} • ${formatMinutes(workload)}` : "Folga"}
                  </p>
                </div>

                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    name={`${weekday}_isWorkingDay`}
                    checked={day.isWorkingDay}
                    onChange={(event) =>
                      updateDay(weekday, {
                        isWorkingDay: event.target.checked,
                        startTime: event.target.checked ? day.startTime ?? fallbackWorkingDay.startTime ?? "09:00" : null,
                        endTime: event.target.checked ? day.endTime ?? fallbackWorkingDay.endTime ?? "18:00" : null,
                        breakMinMinutes: event.target.checked ? day.breakMinMinutes || fallbackWorkingDay.breakMinMinutes : 0,
                      })
                    }
                  />
                  Dia de trabalho
                </label>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Entrada</span>
                  <input
                    type="time"
                    name={`${weekday}_startTime`}
                    value={day.startTime ?? ""}
                    onChange={(event) =>
                      updateDay(weekday, {
                        isWorkingDay: true,
                        startTime: event.target.value || null,
                      })
                    }
                    className="rounded-[0.95rem] border border-border bg-[#faf8f4] px-3 py-3"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Saída</span>
                  <input
                    type="time"
                    name={`${weekday}_endTime`}
                    value={day.endTime ?? ""}
                    onChange={(event) =>
                      updateDay(weekday, {
                        isWorkingDay: true,
                        endTime: event.target.value || null,
                      })
                    }
                    className="rounded-[0.95rem] border border-border bg-[#faf8f4] px-3 py-3"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Intervalo</span>
                  <input
                    type="number"
                    min="0"
                    name={`${weekday}_breakMinMinutes`}
                    value={day.breakMinMinutes}
                    onChange={(event) =>
                      updateDay(weekday, {
                        isWorkingDay: true,
                        breakMinMinutes: Number(event.target.value),
                      })
                    }
                    className="rounded-[0.95rem] border border-border bg-[#faf8f4] px-3 py-3"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Carga</span>
                  <input
                    type="number"
                    min="0"
                    readOnly
                    value={workload}
                    className="rounded-[0.95rem] border border-border bg-[#f1ede4] px-3 py-3 text-muted"
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-border/80 pt-4 text-sm text-muted">
        Total configurado na semana: <span className="font-semibold text-foreground">{formatMinutes(totalWeeklyMinutes)}</span>
      </div>
    </section>
  );
}
