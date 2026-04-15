import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ChevronRight, Clock3 } from "lucide-react";

import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { buildMapUrl, formatLocationLabel } from "@/lib/geocoding";
import { buildTimelineLabel, formatDateTime } from "@/lib/time";

export default async function EmployeeHistoryPage() {
  const session = await requireRole("EMPLOYEE");
  const records = await db.timeRecord.findMany({
    where: { userId: session.sub, isDisregarded: false },
    orderBy: { serverTimestamp: "desc" },
    take: 20,
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5">
      <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(180deg,#6a32df_0%,#4b1fb2_40%,#f4f1ec_40%,#f4f1ec_100%)] shadow-[0_28px_72px_rgba(38,14,92,0.24)]">
        <div className="px-5 pb-6 pt-6 text-white">
          <p className="text-sm text-white/80">Pointer</p>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-tight">Marcações</h1>
          <p className="mt-2 text-sm text-white/78">Consulte suas últimas batidas com horário oficial, foto e origem do registro.</p>
        </div>

        <div className="rounded-t-[2rem] bg-[#f4f1ec] px-5 pb-6 pt-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-[1.4rem] bg-white p-4 shadow-[0_14px_28px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2 text-sm text-muted">
                <Clock3 className="size-4 text-[#5f27d8]" />
                Total exibido
              </div>
              <p className="mt-3 text-2xl font-semibold text-[#1d1830]">{records.length}</p>
            </article>
            <article className="rounded-[1.4rem] bg-white p-4 shadow-[0_14px_28px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2 text-sm text-muted">
                <CalendarDays className="size-4 text-[#5f27d8]" />
                Última marcação
              </div>
              <p className="mt-3 text-2xl font-semibold text-[#1d1830]">
                {records[0] ? buildTimelineLabel(records[0].recordType) : "Sem registros"}
              </p>
            </article>
            <article className="rounded-[1.4rem] bg-white p-4 shadow-[0_14px_28px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2 text-sm text-muted">
                <ChevronRight className="size-4 text-[#5f27d8]" />
                Precisa corrigir?
              </div>
              <Link href="/employee/adjustments" className="mt-3 inline-flex text-base font-semibold text-[#5f27d8]">
                Solicitar acerto
              </Link>
            </article>
          </div>
        </div>
      </section>

      <div className="grid gap-4">
        {records.map((record) => (
          <article key={record.id} className="rounded-[1.5rem] bg-white p-4 shadow-[0_14px_28px_rgba(0,0,0,0.04)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-[#1d1830]">{buildTimelineLabel(record.recordType)}</p>
                <p className="mt-1 text-sm text-muted">{formatDateTime(record.serverTimestamp)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#f3effc] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#5f27d8]">
                    {record.source}
                  </span>
                  {record.latitude && record.longitude ? (
                    <span className="rounded-full bg-[#eef8f3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#1b9f71]">
                      Geo ok
                    </span>
                  ) : null}
                </div>
                {record.latitude && record.longitude ? (
                  <Link
                    href={buildMapUrl(record.latitude.toString(), record.longitude.toString()) ?? "#"}
                    target="_blank"
                    className="mt-3 inline-flex text-sm font-semibold text-[#5f27d8]"
                  >
                    {formatLocationLabel(record.locationAddress) ?? "Abrir local no mapa"}
                  </Link>
                ) : null}
              </div>

              {record.photoUrl ? (
                <Image
                  src={record.photoUrl}
                  alt="Foto da marcacao"
                  width={72}
                  height={72}
                  className="rounded-2xl object-cover"
                />
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
