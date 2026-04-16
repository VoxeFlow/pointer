import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/constants";

function extractTenantSlugFromHost(host: string | null) {
  if (!host) {
    return null;
  }

  const normalizedHost = host.split(":")[0].toLowerCase();
  const rootDomain = (process.env.POINTER_ROOT_DOMAIN || "localhost:3000").split(":")[0].toLowerCase();

  if (
    normalizedHost === rootDomain ||
    normalizedHost === "localhost" ||
    normalizedHost === "127.0.0.1" ||
    normalizedHost === `www.${rootDomain}`
  ) {
    return null;
  }

  if (normalizedHost.endsWith(`.${rootDomain}`)) {
    const subdomain = normalizedHost.slice(0, -(rootDomain.length + 1));
    if (subdomain && subdomain !== "www") {
      return subdomain.split(".").pop() ?? null;
    }
  }

  return null;
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host");
  const tenantSlug = extractTenantSlugFromHost(host);

  if (
    tenantSlug &&
    (pathname === "/" ||
      pathname === "/login" ||
      pathname === "/admin" ||
      pathname.startsWith("/admin/") ||
      pathname === "/employee" ||
      pathname.startsWith("/employee/"))
  ) {
    const rewritten = request.nextUrl.clone();
    if (pathname === "/") {
      rewritten.pathname = `/t/${tenantSlug}`;
    } else if (pathname === "/login") {
      rewritten.pathname = `/t/${tenantSlug}/login`;
    } else {
      rewritten.pathname = `/t/${tenantSlug}${pathname}`;
    }
    return NextResponse.rewrite(rewritten);
  }

  const isProtected = pathname.startsWith("/employee") || pathname.startsWith("/admin");
  const isAuthPage = pathname === "/login";

  if (!token && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icon|apple-icon).*)"],
};
