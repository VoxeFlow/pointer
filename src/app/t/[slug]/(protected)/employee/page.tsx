import { RecordType } from "@prisma/client";

import { InstallCTA } from "@/components/pwa/install-cta";
import { EmployeePanel } from "@/components/time-record/employee-panel";
import { requireTenantSession } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { buildTimelineLabel, formatTime } from "@/lib/time";

export default async function TenantEmployeeHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireTenantSession(slug);

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.sub },
    include: {
      organization: true,
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

  const nextType = [RecordType.ENTRY, RecordType.BREAK_OUT, RecordType.BREAK_IN, RecordType.EXIT][user.timeRecords.length];
  const lastRecord = user.timeRecords.at(-1);
  const basePath = `/t/${slug}/employee`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5">
      <EmployeePanel
        nextStepLabel={nextType ? ["Entrada", "Saída para intervalo", "Retorno do intervalo", "Saída final"][user.timeRecords.length] : null}
        timeRecords={user.timeRecords}
        recordHref={`${basePath}/record`}
      />
      <InstallCTA />
    </div>
  );
}
