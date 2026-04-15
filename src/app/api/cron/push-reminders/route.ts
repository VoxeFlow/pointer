import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { isWebPushConfigured } from "@/lib/web-push";
import { pushReminderService } from "@/services/push-reminder-service";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = env.CRON_SECRET ?? env.POINTER_CRON_SECRET;

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json({ error: "Web Push nao configurado." }, { status: 503 });
  }

  try {
    const results = await pushReminderService.sendRealtimeAttendanceReminders();
    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Falha ao enviar lembretes push.",
      },
      { status: 500 },
    );
  }
}
