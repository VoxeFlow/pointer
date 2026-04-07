import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { monthlyReportService } from "@/services/monthly-report-service";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${env.POINTER_CRON_SECRET}`) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const results = await monthlyReportService.sendPendingMonthlyReports();
    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Falha ao enviar relatorios mensais.",
      },
      { status: 500 },
    );
  }
}
