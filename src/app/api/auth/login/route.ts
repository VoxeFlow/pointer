import { NextResponse } from "next/server";

import { authService } from "@/services/auth-service";
import { assertRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/validations/auth";

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());
    assertRateLimit(`login:${payload.email}`, 8, 60_000);

    const user = await authService.login(payload.email, payload.password, payload.tenantSlug);

    return NextResponse.json({
      success: true,
      redirectTo: payload.tenantSlug
        ? `/t/${payload.tenantSlug}/${user.role === "ADMIN" ? "admin" : "employee"}`
        : user.role === "ADMIN"
          ? "/admin"
          : "/employee",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nao foi possivel autenticar.",
      },
      { status: 400 },
    );
  }
}
