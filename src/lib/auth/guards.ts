import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function requireSession(options?: { allowPasswordChange?: boolean }) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const organization = await db.organization.findUnique({
    where: { id: session.organizationId },
    select: {
      status: true,
    },
  });

  if (!organization) {
    redirect("/login");
  }

  if (session.mustChangePassword && !options?.allowPasswordChange) {
    redirect(session.organizationSlug ? `/t/${session.organizationSlug}/first-access` : "/first-access");
  }

  if (organization.status === "SUSPENDED" && session.role === "EMPLOYEE") {
    redirect(`/t/${session.organizationSlug}/suspended`);
  }

  return session;
}

export async function requireRole(role: "ADMIN" | "EMPLOYEE") {
  const session = await requireSession();

  if (session.role !== role) {
    redirect(session.role === "ADMIN" ? "/admin" : "/employee");
  }

  return session;
}

export async function requireTenantSession(expectedSlug: string, options?: { allowPasswordChange?: boolean }) {
  const session = await requireSession(options);

  if (session.organizationSlug !== expectedSlug) {
    redirect(`/t/${expectedSlug}/login`);
  }

  return session;
}
