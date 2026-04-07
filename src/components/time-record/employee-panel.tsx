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
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
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
          className={`group relative mt-6 flex w-full flex-col items-center justify-center overflow-hidden rounded-[2rem] px-6 py-10 transition-all duration-300 active:scale-[0.98] ${
            canRecord 
              ? "bg-gradient-to-br from-[#171717] to-[#262626] text-white shadow-[0_20px_40px_rgba(0,0,0,0.15)] hover:shadow-[0_25px_50px_rgba(0,0,0,0.2)]" 
              : "bg-[#f5f5f5] text-muted-foreground opacity-60"
          }`}
          style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05),transparent)] opacity-0 transition-opacity group-hover:opacity-100" />
          
          <div className="flex flex-col items-center gap-3">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-500 ${
              canRecord ? "bg-white/10 group-hover:bg-brand group-hover:text-white" : "bg-gray-200"
            }`}>
              <CalendarDays className="size-7" />
            </div>
            <div className="text-center">
              <span className="block text-[1.4rem] font-bold leading-tight tracking-tight">
                {canRecord ? "Registrar ponto" : "Jornada concluida"}
              </span>
              {canRecord && (
                <span className="mt-1 block text-xs font-medium text-white/50 group-hover:text-white/70">
                  Clique para abrir a câmera agora
                </span>
              )}
            </div>
          </div>
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
