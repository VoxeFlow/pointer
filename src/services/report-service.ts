import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";

import { db } from "@/lib/db";

type MonthlyReport = {
  monthKey: string;
  periodLabel: string;
  summary: {
    totalRecords: number;
    inconsistentRecords: number;
    employeesWithRecords: number;
  };
  csv: string;
};

export const reportService = {
  async buildPreviousMonthReport(organizationId: string): Promise<MonthlyReport> {
    const baseDate = subMonths(new Date(), 1);
    const from = startOfMonth(baseDate);
    const to = endOfMonth(baseDate);
    const monthKey = format(baseDate, "yyyy-MM");
    const periodLabel = format(baseDate, "MM/yyyy");

    const records = await db.timeRecord.findMany({
      where: {
        organizationId,
        serverTimestamp: {
          gte: from,
          lte: to,
        },
      },
      include: {
        user: true,
      },
      orderBy: [{ user: { name: "asc" } }, { serverTimestamp: "asc" }],
    });

    const employeesWithRecords = new Set(records.map((record) => record.userId)).size;
    const inconsistentRecords = records.filter((record) => record.isInconsistent).length;

    const csvLines = [
      [
        "Funcionario",
        "Email",
        "Tipo",
        "HorarioServidor",
        "Latitude",
        "Longitude",
        "Origem",
        "Inconsistencia",
      ].join(";"),
      ...records.map((record) =>
        [
          `"${record.user.name}"`,
          `"${record.user.email}"`,
          record.recordType,
          record.serverTimestamp.toISOString(),
          record.latitude?.toString() ?? "",
          record.longitude?.toString() ?? "",
          record.source,
          `"${record.inconsistencyReason ?? ""}"`,
        ].join(";"),
      ),
    ];

    return {
      monthKey,
      periodLabel,
      summary: {
        totalRecords: records.length,
        inconsistentRecords,
        employeesWithRecords,
      },
      csv: csvLines.join("\n"),
    };
  },

  async buildTimeRecordsReport(
    organizationId: string,
    filters: {
      fromDate?: Date;
      toDate?: Date;
      userId?: string;
    },
  ) {
    const { fromDate, toDate, userId } = filters;

    const records = await db.timeRecord.findMany({
      where: {
        organizationId,
        userId: userId || undefined,
        serverTimestamp: {
          gte: fromDate || undefined,
          lte: toDate || undefined,
        },
      },
      include: {
        user: true,
      },
      orderBy: [{ user: { name: "asc" } }, { serverTimestamp: "asc" }],
    });

    const csvLines = [
      ["Funcionario", "Email", "Tipo", "HorarioServidor", "Latitude", "Longitude", "Origem", "Inconsistencia"].join(";"),
      ...records.map((record) =>
        [
          `"${record.user.name}"`,
          `"${record.user.email}"`,
          record.recordType,
          record.serverTimestamp.toISOString(),
          record.latitude?.toString() ?? "",
          record.longitude?.toString() ?? "",
          record.source,
          `"${record.inconsistencyReason ?? ""}"`,
        ].join(";"),
      ),
    ];

    return {
      count: records.length,
      csv: csvLines.join("\n"),
    };
  },
};
