import { RecordType } from "@prisma/client";

import { InstallCTA } from "@/components/pwa/install-cta";
import { EmployeePanel } from "@/components/time-record/employee-panel";
import { hasActiveDeviceConsent } from "@/lib/consent";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getBrasiliaDayBounds } from "@/lib/time";

export default async function EmployeeHomePage() {
  const session = await requireRole("EMPLOYEE");

  const { start, end } = getBrasiliaDayBounds();

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
          isDisregarded: false,
          serverTimestamp: {
            gte: start,
            lte: end,
          },
        },
        orderBy: { serverTimestamp: "asc" },
      },
    },
  });

  const nextType = [RecordType.ENTRY, RecordType.BREAK_OUT, RecordType.BREAK_IN, RecordType.EXIT][user.timeRecords.length];
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5">
      <EmployeePanel
        nextStepLabel={nextType ? ["Entrada", "Saída para intervalo", "Retorno do intervalo", "Saída final"][user.timeRecords.length] : null}
        timeRecords={user.timeRecords}
        webPushPublicKey={env.POINTER_WEB_PUSH_PUBLIC_KEY ?? null}
        deviceConsentActive={hasActiveDeviceConsent(user)}
        workSchedule={
          user.schedule
            ? {
                lateToleranceMinutes: user.schedule.lateToleranceMinutes,
                weekdays: user.schedule.weekdays,
              }
            : null
        }
        recordHref="/employee/record"
      />
      <InstallCTA />
    </div>
  );
}
