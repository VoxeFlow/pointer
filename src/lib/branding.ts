export type TenantBranding = {
  organizationName: string;
  brandDisplayName?: string | null;
  brandLogoUrl?: string | null;
  brandPrimaryColor?: string | null;
  brandAccentColor?: string | null;
};

export function getTenantThemeStyle(branding?: Partial<TenantBranding>) {
  return {
    "--tenant-brand": branding?.brandPrimaryColor || "#171717",
    "--tenant-accent": branding?.brandAccentColor || "#d4ad5b",
  } as React.CSSProperties;
}
