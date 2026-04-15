import { redirect } from "next/navigation";

import { requireTenantSession } from "@/lib/auth/guards";

function getTenantDefaultPath(slug: string, role: "ADMIN" | "ACCOUNTANT" | "EMPLOYEE") {
  if (role === "ADMIN") return `/t/${slug}/admin`;
  if (role === "ACCOUNTANT") return `/t/${slug}/admin/accounting`;
  return `/t/${slug}/employee`;
}

export default async function TenantAppGatewayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireTenantSession(slug);

  redirect(getTenantDefaultPath(slug, session.role));
}
