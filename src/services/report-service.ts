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

  async buildTimeRecordsExcel(
    organizationId: string,
    filters: {
      fromDate?: Date;
      toDate?: Date;
      userId?: string;
    },
  ) {
    const { fromDate, toDate, userId } = filters;
    const ExcelJS = (await import("exceljs")).default;
    
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
        user: { include: { organization: true } },
      },
      orderBy: [{ user: { name: "asc" } }, { serverTimestamp: "asc" }],
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Pointer Plataforma";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Folha de Registros");

    // Adicionar um cabeçalho gigante para a empresa na primeira linha
    const orgName = records[0]?.user?.organization?.brandDisplayName || records[0]?.user?.organization?.name || "Relatório de Ponto";
    sheet.mergeCells('A1:H2');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `📍 ${orgName} - Relatório Consolidado de Registros`;
    titleCell.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF171717" } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Header das Colunas na linha 4
    const headers = ["ID", "Funcionário", "Email", "Tipo de Marcação", "Data e Hora (Servidor)", "Latitude", "Longitude", "Status de Inconsistência"];
    const headerRow = sheet.getRow(4);
    headerRow.values = headers;
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    
    headers.forEach((_, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF444444" } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    // Inserir Registros a partir da linha 5
    records.forEach((record, idx) => {
      const row = sheet.getRow(5 + idx);
      row.values = [
        record.id.slice(0, 8),
        record.user.name,
        record.user.email,
        record.recordType === "ENTRY" ? "Entrada" : "Saída",
        record.serverTimestamp,
        record.latitude ? Number(record.latitude) : "-",
        record.longitude ? Number(record.longitude) : "-",
        record.isInconsistent ? (record.inconsistencyReason || "Inconsistente") : "Validado",
      ];
      
      // Formatação base das celulas
      row.eachCell((cell, colNumber) => {
        if (colNumber === 5) cell.numFmt = "dd/mm/yyyy hh:mm:ss"; // Formatar Data e Hora
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = { bottom: { style: 'hair', color: { argb: "FFDDDDDD" } } };
      });
      // Destacar Tipo: Entrada (Verde) / Saída (Vermelho)
      const typeCell = row.getCell(4);
      if (record.recordType === "ENTRY") typeCell.font = { color: { argb: "FF10B981" }, bold: true };
      if (record.recordType === "EXIT") typeCell.font = { color: { argb: "FFEF4444" }, bold: true };
    });

    // Ajustar larguras das colunas
    sheet.getColumn(1).width = 12;
    sheet.getColumn(2).width = 30;
    sheet.getColumn(3).width = 35;
    sheet.getColumn(4).width = 20;
    sheet.getColumn(5).width = 25;
    sheet.getColumn(6).width = 15;
    sheet.getColumn(7).width = 15;
    sheet.getColumn(8).width = 25;

    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer, count: records.length };
  },
};
