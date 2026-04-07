"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronRight } from "lucide-react";

type EmployeePanelProps = {
  nextStepLabel: string | null;
  recordsCount: number;
  lastRecordLabel: string | null;
  lastRecordTime: string | null;
  recordHref?: string;
};

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function EmployeePanel({
  nextStepLabel,
  recordsCount,
  lastRecordLabel,
  lastRecordTime,
  recordHref = "./record",
}: EmployeePanelProps) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const todayLabel = useMemo(() => formatLongDate(now), [now]);
  const clockLabel = useMemo(() => formatClock(now), [now]);
  const canRecord = Boolean(nextStepLabel);

  function goToRecord() {
    if (!canRecord) {
      return;
    }

    router.push(`${recordHref}${recordHref.includes("?") ? "&" : "?"}openCamera=1`);
  }

  return (
    <section className="grid gap-4">
      <div className="rounded-[1.75rem] border border-black/8 bg-white px-5 py-5 shadow-[0_12px_30px_rgba(0,0,0,0.04)]">
        <p className="text-sm uppercase tracking-[0.18em] text-muted">
          Status:{" "}
          <span className="font-semibold text-foreground">
            {canRecord ? `Aguardando ${nextStepLabel?.toLowerCase()}` : "Jornada concluida"}
          </span>
        </p>

        <div className="mt-5 rounded-[1.4rem] border border-border bg-[#faf8f4] px-5 py-6 text-center">
          <p className="text-[3.6rem] font-semibold leading-none tracking-tight text-foreground">{clockLabel.slice(0, 5)}</p>
          <p className="mt-3 text-sm capitalize text-muted">{todayLabel}</p>
        </div>

        <button
          type="button"
          onClick={goToRecord}
          onContextMenu={(event) => event.preventDefault()}
          disabled={!canRecord}
          className={`relative mt-5 mx-auto flex min-h-[210px] w-full max-w-[320px] select-none touch-manipulation overflow-hidden rounded-[1.9rem] px-6 py-6 text-lg font-semibold transition active:scale-[0.99] ${
            canRecord ? "bg-[#171717] text-white" : "bg-[#d9d3ca] text-[#5f5951]"
          }`}
          style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}
        >
          <span className="relative z-10 flex h-full w-full items-center justify-center text-center">
            <span className="text-[1.7rem] leading-none">{canRecord ? "Registrar ponto" : "Ponto concluido"}</span>
          </span>
        </button>
      </div>

      <section className="rounded-[1.75rem] border border-border bg-white px-4 py-5 shadow-[0_12px_30px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-full bg-[#f5efe1] text-[#8a6a24]">
            <CalendarDays className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Marcações de hoje</h2>
            <p className="mt-1 text-sm text-muted">
              {recordsCount > 0 ? `${recordsCount} registro(s)` : "Nenhum registro ainda"}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[1.2rem] border border-border bg-[#faf8f4] px-4 py-4">
          <p className="text-sm text-muted">Última marcação</p>
          {lastRecordTime ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-base font-semibold text-foreground shadow-[0_6px_18px_rgba(0,0,0,0.04)]">
              <span className="grid size-7 place-items-center rounded-full bg-[#f5efe1] text-[#8a6a24]">
                <ChevronRight className="size-4" />
              </span>
              {lastRecordTime}
            </div>
          ) : (
            <p className="mt-3 text-base font-semibold text-foreground">Aguardando primeira marcação</p>
          )}
          <p className="mt-3 text-sm text-muted">{lastRecordLabel ?? "Seu primeiro registro do dia será a entrada."}</p>
        </div>
      </section>
    </section>
  );
}
