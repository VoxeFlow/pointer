import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { auditLogRepository } from "@/repositories/audit-log-repository";
import { brandingSettingsSchema } from "@/validations/branding";

export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const payload = brandingSettingsSchema.parse(await request.json());
    const organization = await db.organization.update({
      where: { id: session.organizationId },
      data: {
        brandDisplayName: payload.brandDisplayName || null,
        brandLogoUrl: payload.brandLogoUrl || null,
        brandPrimaryColor: payload.brandPrimaryColor || null,
        brandAccentColor: payload.brandAccentColor || null,
      },
    });

    await auditLogRepository.create({
      organizationId: session.organizationId,
      actorUserId: session.sub,
      action: "organization_branding_updated",
      targetType: "organization",
      targetId: organization.id,
      metadataJson: {
        brandDisplayName: organization.brandDisplayName ?? "",
        brandLogoUrl: organization.brandLogoUrl ?? "",
        brandPrimaryColor: organization.brandPrimaryColor ?? "",
        brandAccentColor: organization.brandAccentColor ?? "",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nao foi possivel salvar o branding.",
      },
      { status: 400 },
    );
  }
}
