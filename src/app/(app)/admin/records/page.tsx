import Image from "next/image";
import Link from "next/link";

import { RecordType } from "@prisma/client";

import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { buildMapUrl, formatLocationLabel } from "@/lib/geocoding";
import { buildTimelineLabel, formatDateTime } from "@/lib/time";

type RecordsPageProps = {
  searchParams?: Promise<{
    employeeId?: string;
    type?: string;
    inconsistent?: string;
    from?: string;
    to?: string;
  }>;
};

export default async function AdminRecordsPage({ searchParams }: RecordsPageProps) {
  const session = await requireRole("ADMIN");
  const filters = (await searchParams) ?? {};
  const selectedType = Object.values(RecordType).includes(filters.type as RecordType)
    ? (filters.type as RecordType)
    : undefined;
  const [employees, records] = await Promise.all([
    db.user.findMany({
      where: { organizationId: session.organizationId, role: "EMPLOYEE" },
      orderBy: { name: "asc" },
    }),
    db.timeRecord.findMany({
      where: {
        organizationId: session.organizationId,
        userId: filters.employeeId || undefined,
        recordType: selectedType,
        isInconsistent: filters.inconsistent === "true" ? true : undefined,
        serverTimestamp:
          filters.from || filters.to
            ? {
                gte: filters.from ? new Date(`${filters.from}T00:00:00`) : undefined,
                lte: filters.to ? new Date(`${filters.to}T23:59:59`) : undefined,
              }
            : undefined,
      },
      include: { user: true },
      orderBy: { serverTimestamp: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      <section className="glass rounded-[2rem] p-5">
        <h1 className="text-2xl font-semibold">Registros</h1>
        <p className="mt-2 text-sm text-muted">Auditoria visual de horario, foto, localizacao, origem e inconsistencias.</p>

        <form className="mt-5 grid gap-3 rounded-[1.5rem] border border-border/70 bg-white/65 p-4 sm:grid-cols-2 xl:grid-cols-5">
          <label className="grid gap-2 text-sm">
            <span className="font-semibold">Funcionario</span>
            <select name="employeeId" defaultValue={filters.employeeId ?? ""} className="rounded-[1rem] border border-border bg-white px-4 py-3">
              <option value="">Todos</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-semibold">Tipo</span>
            <select name="type" defaultValue={filters.type ?? ""} className="rounded-[1rem] border border-border bg-white px-4 py-3">
              <option value="">Todos</option>
              {Object.values(RecordType).map((type) => (
                <option key={type} value={type}>
                  {buildTimelineLabel(type)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-semibold">De</span>
            <input name="from" type="date" defaultValue={filters.from ?? ""} className="rounded-[1rem] border border-border bg-white px-4 py-3" />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-semibold">Ate</span>
            <input name="to" type="date" defaultValue={filters.to ?? ""} className="rounded-[1rem] border border-border bg-white px-4 py-3" />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-semibold">Inconsistencia</span>
            <select name="inconsistent" defaultValue={filters.inconsistent ?? ""} className="rounded-[1rem] border border-border bg-white px-4 py-3">
              <option value="">Todos</option>
              <option value="true">Somente inconsistentes</option>
            </select>
          </label>

          <div className="sm:col-span-2 xl:col-span-5 flex flex-wrap gap-3">
            <button type="submit" className="rounded-[1rem] bg-brand px-4 py-3 font-semibold text-white">
              Aplicar filtros
            </button>
            <Link href="/admin/records" className="rounded-[1rem] border border-border bg-white/90 px-4 py-3 font-semibold">
              Limpar
            </Link>
          </div>
        </form>

        <div className="mt-5 grid gap-3">
          {records.map((record) => (
            <article key={record.id} className="rounded-[1.5rem] border border-border/80 bg-white/70 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{record.user.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {buildTimelineLabel(record.recordType)} • {formatDateTime(record.serverTimestamp)}
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    {record.locationAddress
                      ? formatLocationLabel(record.locationAddress)
                      : record.latitude && record.longitude
                      ? `${record.latitude.toString()}, ${record.longitude.toString()}`
                      : "Localizacao ausente"}
                  </p>
                  {record.latitude && record.longitude ? (
                    <Link
                      href={buildMapUrl(record.latitude.toString(), record.longitude.toString()) ?? "#"}
                      target="_blank"
                      className="mt-2 inline-flex text-sm font-semibold text-brand"
                    >
                      Abrir no mapa
                    </Link>
                  ) : null}
                  {record.isInconsistent ? (
                    <p className="mt-2 inline-flex rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
                      {record.inconsistencyReason}
                    </p>
                  ) : null}
                </div>

                {record.photoUrl ? (
                  <Image src={record.photoUrl} alt="Foto da batida" width={72} height={72} className="rounded-2xl object-cover" />
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
