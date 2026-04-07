import { db } from "@/lib/db";

export const timeRecordRepository = {
  listTodayByUser(userId: string, organizationId: string, date = new Date()) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return db.timeRecord.findMany({
      where: {
        organizationId,
        userId,
        serverTimestamp: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { serverTimestamp: "asc" },
    });
  },
  create(data: Parameters<typeof db.timeRecord.create>[0]["data"]) {
    return db.timeRecord.create({ data });
  },
  listByOrganization(organizationId: string, from?: Date, to?: Date) {
    return db.timeRecord.findMany({
      where: {
        organizationId,
        serverTimestamp:
          from || to
            ? {
                gte: from,
                lte: to,
              }
            : undefined,
      },
      include: {
        user: true,
      },
      orderBy: { serverTimestamp: "desc" },
    });
  },
};
