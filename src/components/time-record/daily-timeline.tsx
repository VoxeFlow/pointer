import { type TimeRecord } from "@prisma/client";

import { buildTimelineLabel, formatTime } from "@/lib/time";

export function DailyTimeline({ records }: { records: TimeRecord[] }) {
  return (
    <section className="glass rounded-[2rem] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-brand">Timeline do dia</p>
          <h2 className="mt-2 text-xl font-semibold">Seus horários de hoje</h2>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {records.length === 0 ? (
          <div className="rounded-[1.2rem] border border-dashed border-border bg-white/55 p-4 text-sm text-muted">
            Você ainda não registrou nenhum horário hoje. O primeiro passo será a entrada.
          </div>
        ) : null}

        {records.map((record) => (
          <article key={record.id} className="rounded-[1.25rem] border border-border/80 bg-white/65 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{buildTimelineLabel(record.recordType)}</p>
                <p className="mt-1 text-sm text-muted">{record.isInconsistent ? record.inconsistencyReason : "Registro validado"}</p>
              </div>
              <span className="rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">
                {formatTime(record.serverTimestamp)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
