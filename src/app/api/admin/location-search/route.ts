import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { forwardGeocode } from "@/lib/geocoding";

export async function GET(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 4) {
    return NextResponse.json({ suggestion: null });
  }

  const suggestion = await forwardGeocode(query);
  return NextResponse.json({ suggestion });
}
