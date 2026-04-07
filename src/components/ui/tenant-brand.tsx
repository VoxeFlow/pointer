import Image from "next/image";

type TenantBrandProps = {
  organizationName: string;
  brandDisplayName?: string | null;
  brandLogoUrl?: string | null;
  brandPrimaryColor?: string | null;
  brandAccentColor?: string | null;
  compact?: boolean;
};

export function TenantBrand({
  organizationName,
  brandDisplayName,
  brandLogoUrl,
  brandPrimaryColor,
  brandAccentColor,
  compact = false,
}: TenantBrandProps) {
  const label = brandDisplayName || organizationName;

  if (brandLogoUrl) {
    return (
      <div className="flex items-center gap-3">
        <Image
          src={brandLogoUrl}
          alt={label}
          width={compact ? 36 : 48}
          height={compact ? 36 : 48}
          className="rounded-xl object-cover"
        />
        <div>
          <p className="text-sm font-semibold">{label}</p>
          {!compact ? <p className="text-xs text-muted">{organizationName}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className="grid size-10 place-items-center rounded-xl text-sm font-semibold"
        style={{
          background: brandAccentColor || "rgba(255,255,255,0.12)",
          color: brandPrimaryColor || "currentColor",
        }}
      >
        {label.slice(0, 2).toUpperCase()}
      </div>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        {!compact ? <p className="text-xs text-muted">{organizationName}</p> : null}
      </div>
    </div>
  );
}
