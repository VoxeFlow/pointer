import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { TimeRecordFlow } from "@/components/time-record/time-record-flow";

export default async function RecordPage() {
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

  return <TimeRecordFlow user={user} />;
}
