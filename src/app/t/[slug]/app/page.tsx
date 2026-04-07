import { redirect } from "next/navigation";

import { requireTenantSession } from "@/lib/auth/guards";

export default async function TenantAppGatewayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireTenantSession(slug);

  redirect(`/t/${slug}/${session.role === "ADMIN" ? "admin" : "employee"}`);
}
