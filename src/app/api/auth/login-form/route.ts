import { NextResponse } from "next/server";

import { getRequestOrigin } from "@/lib/http";
import { authService } from "@/services/auth-service";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const tenantSlugRaw = String(formData.get("tenantSlug") ?? "").trim();
  const tenantSlug = tenantSlugRaw || undefined;

  const origin = getRequestOrigin(request);
  const loginUrl = new URL(tenantSlug ? `/t/${tenantSlug}/login` : "/login", origin);

  if (!email || !password) {
    loginUrl.searchParams.set("error", "Preencha e-mail e senha");
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  try {
    const user = await authService.login(email, password, tenantSlug);

    return NextResponse.redirect(
      new URL(
        user.mustChangePassword
          ? tenantSlug
            ? `/t/${tenantSlug}/first-access`
            : "/first-access"
          : tenantSlug
            ? `/t/${tenantSlug}/${user.role === "ADMIN" ? "admin" : "employee"}`
            : user.role === "ADMIN"
              ? "/admin"
              : "/employee",
        origin,
      ),
      { status: 303 },
    );
  } catch (error) {
    loginUrl.searchParams.set(
      "error",
      error instanceof Error ? error.message : "Nao foi possivel entrar.",
    );
    return NextResponse.redirect(loginUrl, { status: 303 });
  }
}
