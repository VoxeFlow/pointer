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

  const { csv } = await reportService.buildTimeRecordsReport(session.organizationId, {
    fromDate,
    toDate,
    userId,
  });

  const filename = userId ? `pointer-report-user-${userId}.csv` : "pointer-report-all.csv";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
