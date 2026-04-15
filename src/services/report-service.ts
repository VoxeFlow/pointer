import { endOfMonth, format, startOfMonth, subMonths, differenceInMinutes } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

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

const TZ = "America/Sao_Paulo";

// Represents one consolidated day row for a single employee
export type DailyRow = {
  date: Date;
  employeeName: string;
  employeeEmail: string;
  entrada: Date | null;         // ENTRY
  saidaIntervalo: Date | null;  // BREAK_OUT
  entradaIntervalo: Date | null;// BREAK_IN
  saida: Date | null;           // EXIT
  breaksMinutes: number | null; // saidaIntervalo -> entradaIntervalo gap
  workedMinutes: number | null; // total worked (excluding break)
  extraMinutes: number | null;  // overtime vs dailyWorkloadMin
  hasInconsistency: boolean;
};

/**
 * Groups flat time records into one consolidated row per (userId, date).
 * Assumes up to 4 records/day: ENTRY, EXIT(lunch), ENTRY(lunch), EXIT(end).
 * Records beyond the 4th are ignored for time calc but flagged.
 */
function buildDailyRows(
  records: Array<{
    userId: string;
    serverTimestamp: Date;
    recordType: string;
    isInconsistent: boolean;
    user: { name: string; email: string };
  }>,
  dailyWorkloadMin: number,
): DailyRow[] {
  // Group by userId + date string
  const map = new Map<string, typeof records>();

  for (const r of records) {
    // Use Brazil local date for grouping — avoids UTC midnight cross-day issues
    const dateKey = formatInTimeZone(r.serverTimestamp, "America/Sao_Paulo", "yyyy-MM-dd");
    const key = `${r.userId}__${dateKey}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }

  const rows: DailyRow[] = [];

  for (const [, dayRecords] of map) {
    dayRecords.sort((a, b) => a.serverTimestamp.getTime() - b.serverTimestamp.getTime());

    const first = dayRecords[0];
    const entradaRecord = dayRecords.find((record) => record.recordType === "ENTRY");
    const saidaIntervaloRecord = dayRecords.find((record) => record.recordType === "BREAK_OUT");
    const entradaIntervaloRecord = dayRecords.find((record) => record.recordType === "BREAK_IN");
    const saidaRecord = [...dayRecords].reverse().find((record) => record.recordType === "EXIT");

    const entrada = entradaRecord?.serverTimestamp ?? null;
    const saidaIntervalo = saidaIntervaloRecord?.serverTimestamp ?? null;
    const entradaIntervalo = entradaIntervaloRecord?.serverTimestamp ?? null;
    const saida = saidaRecord?.serverTimestamp ?? null;

    // Break: middle EXIT -> middle ENTRY
    const breaksMinutes =
      saidaIntervalo && entradaIntervalo
        ? differenceInMinutes(entradaIntervalo, saidaIntervalo)
        : null;

    // Worked: (saidaIntervalo - entrada) + (saida - entradaIntervalo)
    let workedMinutes: number | null = null;
    if (entrada && saida) {
      workedMinutes =
        differenceInMinutes(saida, entrada) -
        (breaksMinutes ?? 0);
    }

    const extraMinutes =
      workedMinutes !== null && workedMinutes > dailyWorkloadMin
        ? workedMinutes - dailyWorkloadMin
        : null;

    const sequenceBroken =
      dayRecords.length > 4 ||
      (!!saidaIntervalo && !entrada) ||
      (!!entradaIntervalo && !saidaIntervalo) ||
      (!!saida && !entrada) ||
      (!!entrada && !saida && dayRecords.some((record) => record.recordType !== "ENTRY"));

    const hasInconsistency = sequenceBroken || dayRecords.some((r) => r.isInconsistent);

    // Persist the consolidated row date as the start of the local Brazil workday,
    // then always format it back in the same timezone for CSV/Excel/PDF.
    const localDateKey = formatInTimeZone(first.serverTimestamp, TZ, "yyyy-MM-dd");

    rows.push({
      date: fromZonedTime(`${localDateKey}T00:00:00`, TZ),
      employeeName: first.user.name,
      employeeEmail: first.user.email,
      entrada,
      saidaIntervalo,
      entradaIntervalo,
      saida,
      breaksMinutes,
      workedMinutes,
      extraMinutes,
      hasInconsistency,
    });
  }

  rows.sort(
    (a, b) => a.employeeName.localeCompare(b.employeeName) || a.date.getTime() - b.date.getTime(),
  );

  return rows;
}

function fmtTime(d: Date | null): string {
  return d ? formatInTimeZone(d, TZ, "HH:mm") : "-";
}
function fmtDate(d: Date): string {
  return formatInTimeZone(d, TZ, "dd/MM/yyyy");
}
function fmtMinutes(min: number | null): string {
  if (min === null) return "-";
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

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
        isDisregarded: false,
        serverTimestamp: { gte: from, lte: to },
      },
      include: { user: true },
      orderBy: [{ user: { name: "asc" } }, { serverTimestamp: "asc" }],
    });

    const organization = await db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { defaultDailyWorkloadMin: true },
    });

    const employeesWithRecords = new Set(records.map((r) => r.userId)).size;
    const inconsistentRecords = records.filter((r) => r.isInconsistent).length;

    const rows = buildDailyRows(records, organization.defaultDailyWorkloadMin);

    const csvHeaders = [
      "Data",
      "Funcionário",
      "Email",
      "Entrada",
      "Saída Intervalo",
      "Entrada Intervalo",
      "Saída",
      "Min. Intervalo",
      "Horas Trabalhadas",
      "Horas Extras",
      "Inconsistência",
    ].join(";");

    const csvLines = [
      csvHeaders,
      ...rows.map((r) =>
        [
          `"${fmtDate(r.date)}"`,
          `"${r.employeeName}"`,
          `"${r.employeeEmail}"`,
          fmtTime(r.entrada),
          fmtTime(r.saidaIntervalo),
          fmtTime(r.entradaIntervalo),
          fmtTime(r.saida),
          r.breaksMinutes !== null ? r.breaksMinutes : "-",
          fmtMinutes(r.workedMinutes),
          fmtMinutes(r.extraMinutes),
          r.hasInconsistency ? "Sim" : "Não",
        ].join(";"),
      ),
    ];

    return {
      monthKey,
      periodLabel,
      summary: { totalRecords: records.length, inconsistentRecords, employeesWithRecords },
      csv: csvLines.join("\n"),
    };
  },

  async buildTimeRecordsExcel(
    organizationId: string,
    filters: { fromDate?: Date; toDate?: Date; userId?: string },
  ) {
    const { fromDate, toDate, userId } = filters;
    const ExcelJS = (await import("exceljs")).default;

    const [records, organization] = await Promise.all([
      db.timeRecord.findMany({
        where: {
          organizationId,
          isDisregarded: false,
          userId: userId || undefined,
          serverTimestamp: {
            gte: fromDate || undefined,
            lte: toDate || undefined,
          },
        },
        include: { user: { include: { organization: true } } },
        orderBy: [{ user: { name: "asc" } }, { serverTimestamp: "asc" }],
      }),
      db.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { defaultDailyWorkloadMin: true, brandDisplayName: true, name: true },
      }),
    ]);

    const rows = buildDailyRows(records, organization.defaultDailyWorkloadMin);
    const orgName = organization.brandDisplayName || organization.name;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Pointer Plataforma";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Espelho de Ponto");

    // Row 1-2: Company title banner
    sheet.mergeCells("A1:K2");
    const titleCell = sheet.getCell("A1");
    titleCell.value = `${orgName} — Espelho de Ponto`;
    titleCell.font = { size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF171717" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).height = 36;

    // Row 3: Column headers
    const HEADERS = [
      "Data",
      "Funcionário",
      "Entrada",
      "Saída Intervalo",
      "Entrada Intervalo",
      "Saída",
      "Interv. (min)",
      "Trab. (hh:mm)",
      "Extra (hh:mm)",
      "Inconsist.",
    ];

    const headerRow = sheet.getRow(3);
    headerRow.values = HEADERS;
    headerRow.height = 22;
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    HEADERS.forEach((_, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2D2D2D" } };
      cell.border = {
        top: { style: "thin", color: { argb: "FF444444" } },
        bottom: { style: "thin", color: { argb: "FF444444" } },
        left: { style: "thin", color: { argb: "FF444444" } },
        right: { style: "thin", color: { argb: "FF444444" } },
      };
    });

    // Data rows starting at 4
    rows.forEach((row, idx) => {
      const r = sheet.getRow(4 + idx);
      r.height = 18;
      r.values = [
        fmtDate(row.date),
        row.employeeName,
        fmtTime(row.entrada),
        fmtTime(row.saidaIntervalo),
        fmtTime(row.entradaIntervalo),
        fmtTime(row.saida),
        row.breaksMinutes !== null ? row.breaksMinutes : "-",
        fmtMinutes(row.workedMinutes),
        row.extraMinutes !== null ? fmtMinutes(row.extraMinutes) : "-",
        row.hasInconsistency ? "⚠️ Sim" : "OK",
      ];

      const isEven = idx % 2 === 0;
      r.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.alignment = { vertical: "middle", horizontal: colNum <= 2 ? "left" : "center" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isEven ? "FFFAFAFA" : "FFF0F0F0" },
        };
        cell.border = { bottom: { style: "hair", color: { argb: "FFDDDDDD" } } };
      });

      // Color overtime column green/red
      if (row.extraMinutes !== null && row.extraMinutes > 0) {
        r.getCell(9).font = { color: { argb: "FF16A34A" }, bold: true };
      }
      if (row.hasInconsistency) {
        r.getCell(10).font = { color: { argb: "FFDC2626" }, bold: true };
      }
    });

    // Column widths
    [14, 30, 10, 16, 16, 10, 14, 14, 14, 12].forEach((w, i) => {
      sheet.getColumn(i + 1).width = w;
    });

    // Freeze header rows
    sheet.views = [{ state: "frozen", ySplit: 3 }];

    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer, count: rows.length, rows };
  },

  // For the print page to reuse
  async buildDailyRowsForPrint(
    organizationId: string,
    filters: { fromDate?: Date; toDate?: Date; userId?: string },
  ) {
    const { fromDate, toDate, userId } = filters;

    const [records, organization] = await Promise.all([
      db.timeRecord.findMany({
        where: {
          organizationId,
          isDisregarded: false,
          userId: userId || undefined,
          serverTimestamp: {
            gte: fromDate || undefined,
            lte: toDate || undefined,
          },
        },
        include: { user: true },
        orderBy: [{ user: { name: "asc" } }, { serverTimestamp: "asc" }],
      }),
      db.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { defaultDailyWorkloadMin: true },
      }),
    ]);

    return buildDailyRows(records, organization.defaultDailyWorkloadMin);
  },
};

export { fmtTime, fmtDate, fmtMinutes };
