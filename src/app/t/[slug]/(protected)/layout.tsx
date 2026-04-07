import { AppShell } from "@/components/layout/app-shell";
import { requireTenantSession } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { getTenantThemeStyle } from "@/lib/branding";

export default async function TenantProtectedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireTenantSession(slug);
  const organization = await db.organization.findUniqueOrThrow({
    where: { id: session.organizationId },
    select: {
      name: true,
      brandDisplayName: true,
      brandLogoUrl: true,
      brandPrimaryColor: true,
      brandAccentColor: true,
      status: true,
      billingSubscriptionStatus: true,
    },
  });

  return (
    <div
      style={getTenantThemeStyle({
        organizationName: organization.name,
        brandDisplayName: organization.brandDisplayName,
        brandLogoUrl: organization.brandLogoUrl,
        brandPrimaryColor: organization.brandPrimaryColor,
        brandAccentColor: organization.brandAccentColor,
      })}
    >
      <AppShell
        session={session}
        basePath={`/t/${slug}`}
        branding={{
          organizationName: organization.name,
          brandDisplayName: organization.brandDisplayName,
          brandLogoUrl: organization.brandLogoUrl,
          brandPrimaryColor: organization.brandPrimaryColor,
          brandAccentColor: organization.brandAccentColor,
        }}
        organizationStatus={organization.status}
        billingStatus={organization.billingSubscriptionStatus}
      >
        {children}
      </AppShell>
    </div>
  );
}
