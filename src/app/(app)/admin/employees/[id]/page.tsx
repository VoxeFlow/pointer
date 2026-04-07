import Image from "next/image";
import { notFound } from "next/navigation";

import { updateEmployeeAction } from "@/app/(app)/admin/employees/actions";
import { EmployeeForm } from "@/components/admin/employee-form";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { buildMapUrl, formatLocationLabel } from "@/lib/geocoding";
import { createDefaultWeeklySchedule, normalizeWeeklySchedule, summarizeWeeklySchedule } from "@/lib/schedule";
import { buildTimelineLabel, formatDateTime } from "@/lib/time";
import { formatDailyWorkload } from "@/lib/utils";
import { ManualRecordForm } from "@/components/admin/manual-record-form";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { RecordSource } from "@prisma/client";

export default async function AdminEmployeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; created?: string; manual_created?: string; error?: string }>;
}) {
  const session = await requireRole("ADMIN");
  const { id } = await params;
  const { saved, created, manual_created, error } = await searchParams;
  const [employee, organization] = await Promise.all([
    db.user.findFirst({
      where: { id, organizationId: session.organizationId, role: "EMPLOYEE" },
      include: {
        schedule: {
          include: {
            weekdays: true,
          },
        },
        timeRecords: {
          orderBy: { serverTimestamp: "desc" },
          take: 30,
        },
      },
    }),
    db.organization.findUniqueOrThrow({
      where: { id: session.organizationId },
    }),
  ]);

  if (!employee) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      <section className="glass rounded-[2rem] p-5">
        <h1 className="text-2xl font-semibold">{employee.name}</h1>
        <p className="mt-2 text-sm text-muted">{employee.email}</p>
        <p className="mt-2 text-sm text-muted">
          Jornada: {employee.schedule ? summarizeWeeklySchedule(employee.schedule.weekdays).slice(0, 3).join(" • ") : "Nao configurada"}
        </p>
        <p className="mt-2 text-sm text-muted">
          Jornada diária contratual: {employee.schedule ? formatDailyWorkload(employee.schedule.dailyWorkloadMinutes) : "Nao configurada"}
        </p>
      </section>

      <section className="glass mt-4 rounded-[2rem] p-5">
        <h2 className="text-lg font-semibold">Editar cadastro</h2>
        <p className="mt-2 text-sm text-muted">Alteracoes relevantes ficam registradas na trilha de auditoria do Pointer.</p>
        <div className="mt-5">
          <EmployeeForm
            mode="edit"
            action={updateEmployeeAction.bind(null, employee.id)}
            employee={employee}
            defaults={{
              lateToleranceMinutes: organization.defaultLateToleranceMin,
              weekdays: normalizeWeeklySchedule(employee.schedule?.weekdays ?? createDefaultWeeklySchedule(), {
                expectedStartTime: employee.schedule?.expectedStartTime ?? "09:00",
                expectedEndTime: employee.schedule?.expectedEndTime ?? "18:00",
                breakMinMinutes: employee.schedule?.breakMinMinutes ?? organization.defaultBreakMinMinutes,
                dailyWorkloadMinutes: employee.schedule?.dailyWorkloadMinutes ?? organization.defaultDailyWorkloadMin,
              }),
            }}
            feedback={
              error ? (
                <p className="rounded-[1rem] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
              ) : saved || created ? (
                <p className="rounded-[1rem] bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {created ? "Funcionario cadastrado com sucesso." : "Alteracoes salvas com sucesso."}
                </p>
              ) : null
            }
          />
        </div>
      </section>

      <section className="glass mt-4 rounded-[2rem] p-5">
        <h2 className="text-lg font-semibold">Ajuste manual</h2>
        <p className="mt-2 text-sm text-muted">Use para corrigir batidas esquecidas ou erros de marcacao.</p>
        
        <div className="mt-5">
          <ManualRecordForm employeeId={employee.id} />
          {manual_created && (
            <p className="mt-4 rounded-[1rem] bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Registro manual criado com sucesso.
            </p>
          )}
        </div>
      </section>

      <section className="mt-4 grid gap-4">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {employee.timeRecords.map((record: any) => (
          <article key={record.id} className="glass rounded-[1.5rem] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{buildTimelineLabel(record.recordType)}</p>
                <p className="mt-1 text-sm text-muted">{formatDateTime(record.serverTimestamp)}</p>
                <p className="mt-2 text-sm text-muted">
                  {record.locationAddress
                    ? formatLocationLabel(record.locationAddress)
                    : record.latitude && record.longitude
                    ? `${record.latitude.toString()}, ${record.longitude.toString()}`
                    : "Sem localizacao"}
                </p>
                  {record.latitude && record.longitude ? (
                    <a
                      href={buildMapUrl(record.latitude.toString(), record.longitude.toString()) ?? "#"}
                      target="_blank"
                      className="mt-2 inline-flex text-sm font-semibold text-brand"
                    >
                      Abrir no mapa
                    </a>
                  ) : null}
                </div>

                <div className="flex flex-col items-end gap-2">
                  {record.source === "MANUAL" && (
                    <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">MANUAL</span>
                  )}
                  {record.photoUrl ? (
                    <Image src={record.photoUrl} alt="Foto do registro" width={80} height={80} className="rounded-2xl object-cover" />
                  ) : null}
                </div>
              </div>

              {record.adjustmentNote && (
                <div className="mt-4 border-t border-dashed border-white/20 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Motivo do Ajuste</p>
                  <p className="mt-1 text-sm">{record.adjustmentNote}</p>
                </div>
              )}
            </article>
        ))}
      </section>
    </div>
  );
}
