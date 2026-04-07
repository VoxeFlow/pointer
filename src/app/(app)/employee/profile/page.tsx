import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { roleLabels } from "@/lib/constants";
import { summarizeWeeklySchedule } from "@/lib/schedule";
import { formatDailyWorkload } from "@/lib/utils";

export default async function EmployeeProfilePage() {
  const session = await requireRole("EMPLOYEE");
  const user = await db.user.findUniqueOrThrow({
    where: { id: session.sub },
    include: {
      organization: true,
      schedule: {
        include: {
          weekdays: true,
        },
      },
    },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5">
      <section className="glass rounded-[2rem] p-5">
        <h1 className="text-2xl font-semibold">Perfil</h1>
        <div className="mt-5 grid gap-4 text-sm text-muted">
          <p>
            <span className="font-semibold text-foreground">Nome:</span> {user.name}
          </p>
          <p>
            <span className="font-semibold text-foreground">E-mail:</span> {user.email}
          </p>
          <p>
            <span className="font-semibold text-foreground">Perfil:</span> {roleLabels[user.role]}
          </p>
          <p>
            <span className="font-semibold text-foreground">Jornada:</span>{" "}
            {user.schedule ? summarizeWeeklySchedule(user.schedule.weekdays).slice(0, 3).join(" • ") : "Nao configurada"}
          </p>
          <p>
            <span className="font-semibold text-foreground">Jornada diária contratual:</span>{" "}
            {user.schedule ? formatDailyWorkload(user.schedule.dailyWorkloadMinutes) : "Nao configurada"}
          </p>
          <p>
            <span className="font-semibold text-foreground">Empresa:</span> {user.organization.name}
          </p>
        </div>
      </section>
    </div>
  );
}
