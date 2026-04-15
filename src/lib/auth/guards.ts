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

export async function requireRole(role: "ADMIN" | "ACCOUNTANT" | "EMPLOYEE") {
  const session = await requireSession();

  if (session.role !== role) {
    if (session.role === "ADMIN") {
      redirect("/admin");
    }

    if (session.role === "ACCOUNTANT") {
      redirect("/admin/accounting");
    }

    redirect("/employee");
  }

  return session;
}

export async function requireRoles(roles: Array<"ADMIN" | "ACCOUNTANT" | "EMPLOYEE">) {
  const session = await requireSession();

  if (!roles.includes(session.role)) {
    if (session.role === "ADMIN") {
      redirect("/admin");
    }

    if (session.role === "ACCOUNTANT") {
      redirect("/admin/accounting");
    }

    redirect("/employee");
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
