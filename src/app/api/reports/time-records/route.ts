import { type NextRequest, NextResponse } from "next/server";
import { parseISO, isValid, endOfDay, startOfDay, format } from "date-fns";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { reportService } from "@/services/report-service";

function sanitizeFilenamePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
}

function buildPeriodLabel(fromDate?: Date, toDate?: Date) {
  if (fromDate && toDate) {
    return `${format(fromDate, "dd-MM-yyyy")}_A_${format(toDate, "dd-MM-yyyy")}`;
  }

  if (fromDate) {
    return `A_PARTIR_DE_${format(fromDate, "dd-MM-yyyy")}`;
  }

  if (toDate) {
    return `ATE_${format(toDate, "dd-MM-yyyy")}`;
  }

  return "PERIODO_COMPLETO";
}

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNTANT")) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const userId = searchParams.get("userId") || undefined;

  let fromDate: Date | undefined;
  let toDate: Date | undefined;

  if (fromStr) {
    const parsed = parseISO(fromStr);
    if (isValid(parsed)) fromDate = startOfDay(parsed);
  }

  if (toStr) {
    const parsed = parseISO(toStr);
    if (isValid(parsed)) toDate = endOfDay(parsed);
  }

  const [{ buffer }, organization] = await Promise.all([
    reportService.buildTimeRecordsExcel(session.organizationId, {
      fromDate,
      toDate,
      userId,
    }),
    db.organization.findUniqueOrThrow({
      where: { id: session.organizationId },
      select: { brandDisplayName: true, name: true },
    }),
  ]);

  const establishmentName = sanitizeFilenamePart(organization.brandDisplayName || organization.name);
  const periodLabel = buildPeriodLabel(fromDate, toDate);
  const filename = `POINTER-${establishmentName}-${periodLabel}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
