import { NextResponse } from "next/server";

import { authService } from "@/services/auth-service";
import { assertRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/validations/auth";

function getPostLoginPath(role: "ADMIN" | "ACCOUNTANT" | "EMPLOYEE", tenantSlug?: string) {
  if (tenantSlug) {
    if (role === "ADMIN") return `/t/${tenantSlug}/admin`;
    if (role === "ACCOUNTANT") return `/t/${tenantSlug}/admin/accounting`;
    return `/t/${tenantSlug}/employee`;
  }

  if (role === "ADMIN") return "/admin";
  if (role === "ACCOUNTANT") return "/admin/accounting";
  return "/employee";
}

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());
    assertRateLimit(`login:${payload.email}`, 8, 60_000);

    const user = await authService.login(payload.email, payload.password, payload.tenantSlug);

    return NextResponse.json({
      success: true,
      redirectTo: getPostLoginPath(user.role, payload.tenantSlug),
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
