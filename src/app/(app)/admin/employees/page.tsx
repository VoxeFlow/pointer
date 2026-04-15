import Link from "next/link";

import { createEmployeeAction } from "@/app/(app)/admin/employees/actions";
import { EmployeeForm } from "@/components/admin/employee-form";
import { EmployeeStatusToggle } from "@/components/admin/employee-status-toggle";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { createDefaultWeeklySchedule, normalizeWeeklySchedule, summarizeWeeklySchedule } from "@/lib/schedule";
import { buildTimelineLabel } from "@/lib/time";

export default async function AdminEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireRole("ADMIN");
  const { error } = await searchParams;
  const [organization, employees] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: session.organizationId },
    }),
    db.user.findMany({
      where: { organizationId: session.organizationId, role: "EMPLOYEE" },
      include: {
        schedule: {
          include: {
            weekdays: {
              orderBy: { weekday: "asc" },
            },
          },
        },
        timeRecords: {
          where: {
            isDisregarded: false,
          },
          orderBy: { serverTimestamp: "desc" },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      <section className="glass rounded-[2rem] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Funcionarios</h1>
            <p className="mt-2 text-sm text-muted">Status do dia, ultimo registro e acesso rapido ao historico individual.</p>
          </div>
        </div>
      </section>

      <section className="glass mt-4 rounded-[2rem] p-5">
        <h2 className="text-lg font-semibold">Cadastrar novo funcionario</h2>
        <p className="mt-2 text-sm text-muted">
          O Pointer cria funcionario e jornada em estrutura isolada do proprio projeto. Nenhum cadastro toca sistemas antigos.
        </p>
        <p className="mt-2 text-sm text-muted">
          Uso atual do plano: {employees.length}/{organization.maxEmployees} funcionarios.
        </p>

        <div className="mt-5">
          <EmployeeForm
            mode="create"
            action={createEmployeeAction}
            defaults={{
              lateToleranceMinutes: organization.defaultLateToleranceMin,
              weekdays: normalizeWeeklySchedule(createDefaultWeeklySchedule(), {
                expectedStartTime: "09:00",
                expectedEndTime: "18:00",
                breakMinMinutes: organization.defaultBreakMinMinutes,
                dailyWorkloadMinutes: organization.defaultDailyWorkloadMin,
              }),
            }}
            feedback={
              error ? <p className="rounded-[1rem] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null
            }
          />
        </div>
      </section>

      <section className="glass mt-4 rounded-[2rem] p-5">
        <h2 className="text-lg font-semibold">Equipe cadastrada</h2>
        <div className="mt-5 grid gap-3">
          {employees.map((employee) => (
            <article key={employee.id} className="rounded-[1.5rem] border border-border/80 bg-white/70 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link href={`/admin/employees/${employee.id}`} className="font-semibold transition hover:text-brand">
                    {employee.name}
                  </Link>
                  <p className="mt-1 truncate text-sm text-muted">{employee.email}</p>
                </div>
                <div className="text-right text-sm text-muted">
                  <p>{employee.isActive ? "Ativo" : "Inativo"}</p>
                  <p className="mt-1">
                    {employee.timeRecords[0] ? buildTimelineLabel(employee.timeRecords[0].recordType) : "Sem marcacao"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.18em] text-muted">
                  {employee.schedule
                    ? summarizeWeeklySchedule(employee.schedule.weekdays).slice(0, 2).join(" • ")
                    : "Jornada nao configurada"}
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/admin/employees/${employee.id}`} className="text-sm font-semibold text-brand">
                    Ver detalhes
                  </Link>
                  <EmployeeStatusToggle employeeId={employee.id} isActive={employee.isActive} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
