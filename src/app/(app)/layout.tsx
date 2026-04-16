import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { getTenantThemeStyle } from "@/lib/branding";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const organization = await db.organization
    .findUniqueOrThrow({
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
    })
    .catch(async () => {
      const legacy = await db.organization.findUniqueOrThrow({
        where: { id: session.organizationId },
        select: {
          name: true,
          status: true,
        },
      });

      return {
        ...legacy,
        brandDisplayName: null,
        brandLogoUrl: null,
        brandPrimaryColor: null,
        brandAccentColor: null,
        billingSubscriptionStatus: "NONE" as const,
      };
    });

  return (
    <div style={getTenantThemeStyle({
      organizationName: organization.name,
      brandDisplayName: organization.brandDisplayName,
      brandLogoUrl: organization.brandLogoUrl,
      brandPrimaryColor: organization.brandPrimaryColor,
      brandAccentColor: organization.brandAccentColor,
    })}>
      <AppShell
        session={session}
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
