import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatTime } from "@/lib/time";
import { TimeRecordError } from "@/services/time-record-errors";
import { timeRecordService } from "@/services/time-record-service";
import { createTimeRecordSchema } from "@/validations/time-record";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Sessao expirada. Entre novamente.", code: "SESSION_EXPIRED" }, { status: 401 });
    }

    if (session.role !== "EMPLOYEE") {
      return NextResponse.json({ error: "Apenas funcionarios podem registrar ponto.", code: "UNAUTHORIZED" }, { status: 403 });
    }

    const formData = await request.formData();
    const parsed = createTimeRecordSchema.parse({
      latitude: formData.get("latitude"),
      longitude: formData.get("longitude"),
      accuracy: formData.get("accuracy"),
      clientTimestamp: formData.get("clientTimestamp"),
      geoCapturedAt: formData.get("geoCapturedAt"),
      source: formData.get("source"),
    });

    const photo = formData.get("photo");

    if (photo && !(photo instanceof File)) {
      return NextResponse.json({ error: "Arquivo de foto invalido." }, { status: 400 });
    }

    if (photo instanceof File) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
      if (!allowedTypes.includes(photo.type) || photo.size > 8 * 1024 * 1024) {
        return NextResponse.json({ error: "Envie uma imagem valida com ate 8 MB.", code: "VALIDATION_ERROR" }, { status: 400 });
      }
    }

    const user = await db.user.findUniqueOrThrow({
      where: { id: session.sub },
      include: {
        organization: true,
        schedule: {
          include: {
            weekdays: true,
          },
        },
      },
    });

    const result = await timeRecordService.create({
      user,
      photo: photo instanceof File ? photo : null,
      ...parsed,
    });

    return NextResponse.json({
      success: true,
      label: result.label,
      time: formatTime(result.record.serverTimestamp),
    });
  } catch (error) {
    // Log do erro real no servidor para facilitar debug pelo desenvolvedor
    console.error("[TIME_RECORD_POST] Error:", error);

    if (error instanceof TimeRecordError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Nao foi possivel registrar o ponto.";
    
    return NextResponse.json(
      {
        error: message,
        code: "UNKNOWN_ERROR",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 400 },
    );
  }
}
