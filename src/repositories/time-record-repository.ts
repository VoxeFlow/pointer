import { db } from "@/lib/db";
import { getBrasiliaDayBounds } from "@/lib/time";

export const timeRecordRepository = {
  listTodayByUser(userId: string, organizationId: string, date = new Date()) {
    const { start, end } = getBrasiliaDayBounds(date);

    return db.timeRecord.findMany({
      where: {
        organizationId,
        userId,
        isDisregarded: false,
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
  findById(id: string) {
    return db.timeRecord.findUnique({
      where: { id },
    });
  },
  update(id: string, data: Parameters<typeof db.timeRecord.update>[0]["data"]) {
    return db.timeRecord.update({
      where: { id },
      data,
    });
  },
  listByOrganization(organizationId: string, from?: Date, to?: Date) {
    return db.timeRecord.findMany({
      where: {
        organizationId,
        isDisregarded: false,
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
