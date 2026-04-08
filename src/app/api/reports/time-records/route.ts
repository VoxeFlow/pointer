import { type NextRequest, NextResponse } from "next/server";
import { parseISO, isValid, endOfDay, startOfDay } from "date-fns";

import { getSession } from "@/lib/auth/session";
import { reportService } from "@/services/report-service";

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
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

  const { buffer, count } = await reportService.buildTimeRecordsExcel(session.organizationId, {
    fromDate,
    toDate,
    userId,
  });

  const filename = userId ? `pointer-report-user-${userId}.xlsx` : "pointer-report-all.xlsx";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
