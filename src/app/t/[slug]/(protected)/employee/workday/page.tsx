import { requireTenantSession } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { DailyTimeline } from "@/components/time-record/daily-timeline";
import { getTodayWorkSummary } from "@/lib/time";
import { formatMinutes } from "@/lib/utils";

export default async function TenantEmployeeWorkdayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireTenantSession(slug);

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.sub },
    include: {
      schedule: {
        include: {
          weekdays: true,
        },
      },
      timeRecords: {
        where: {
          serverTimestamp: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
        orderBy: { serverTimestamp: "asc" },
      },
    },
  });

  const summary = getTodayWorkSummary(user.timeRecords, user.schedule, new Date());

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5">
      <section className="glass rounded-[2rem] p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Jornada de trabalho</p>
        <h1 className="mt-2 text-2xl font-semibold">Resumo de hoje</h1>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.2rem] border border-border bg-white px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Status</p>
            <p className="mt-2 text-lg font-semibold">{summary.journeyStatus}</p>
          </div>
          <div className="rounded-[1.2rem] border border-border bg-white px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Jornada prevista</p>
            <p className="mt-2 text-lg font-semibold">{summary.isWorkingDay ? summary.label : "Folga"}</p>
          </div>
          <div className="rounded-[1.2rem] border border-border bg-white px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Trabalhado</p>
            <p className="mt-2 text-lg font-semibold">{formatMinutes(summary.workedMinutes)}</p>
          </div>
          <div className="rounded-[1.2rem] border border-border bg-white px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Faltante</p>
            <p className="mt-2 text-lg font-semibold">{summary.isWorkingDay ? formatMinutes(summary.missingMinutes) : "Sem jornada"}</p>
          </div>
          <div className="rounded-[1.2rem] border border-border bg-white px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Hora extra</p>
            <p className="mt-2 text-lg font-semibold">{summary.extraMinutes > 0 ? formatMinutes(summary.extraMinutes) : "Sem extra"}</p>
          </div>
          <div className="rounded-[1.2rem] border border-border bg-white px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Intervalo previsto</p>
            <p className="mt-2 text-lg font-semibold">{summary.expectedBreakMinutes} min</p>
          </div>
        </div>
      </section>

      <DailyTimeline records={user.timeRecords} />
    </div>
  );
}
