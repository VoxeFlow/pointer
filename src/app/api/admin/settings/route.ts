import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { forwardGeocode } from "@/lib/geocoding";
import { auditLogRepository } from "@/repositories/audit-log-repository";
import { organizationSettingsSchema } from "@/validations/settings";

function extractAddressNumber(value?: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/\b(\d{1,6}[A-Za-z]?)\b/);
  return match?.[1]?.toLowerCase() ?? null;
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const currentOrganization = await db.organization.findUniqueOrThrow({
      where: { id: session.organizationId },
    });

    const rawPayload = organizationSettingsSchema.parse(await request.json());
    const payload = {
      ...rawPayload,
      monthlyReportEnabled:
        rawPayload.monthlyReportEnabled ?? currentOrganization.monthlyReportEnabled,
      accountantReportEmail:
        rawPayload.accountantReportEmail !== undefined
          ? rawPayload.accountantReportEmail || null
          : currentOrganization.accountantReportEmail,
      enforceWorksiteRadius:
        rawPayload.enforceWorksiteRadius ?? currentOrganization.enforceWorksiteRadius,
      worksiteRadiusMeters:
        rawPayload.worksiteRadiusMeters ?? currentOrganization.worksiteRadiusMeters,
      worksiteAddress:
        rawPayload.worksiteAddress !== undefined
          ? rawPayload.worksiteAddress
          : currentOrganization.worksiteAddress ?? undefined,
      worksiteLatitude:
        rawPayload.worksiteLatitude !== undefined
          ? rawPayload.worksiteLatitude
          : currentOrganization.worksiteLatitude
            ? Number(currentOrganization.worksiteLatitude)
            : undefined,
      worksiteLongitude:
        rawPayload.worksiteLongitude !== undefined
          ? rawPayload.worksiteLongitude
          : currentOrganization.worksiteLongitude
            ? Number(currentOrganization.worksiteLongitude)
            : undefined,
    };

    const worksiteAddressInput = payload.worksiteAddress?.trim() || null;
    const hasManualCoordinates =
      rawPayload.worksiteLatitude !== undefined && rawPayload.worksiteLongitude !== undefined;
    const geocodedWorksite =
      !hasManualCoordinates && worksiteAddressInput ? await forwardGeocode(worksiteAddressInput) : null;
    const resolvedWorksite = hasManualCoordinates
      ? {
          addressText: worksiteAddressInput ?? currentOrganization.worksiteAddress ?? "",
          provider: "manual",
          latitude: payload.worksiteLatitude!,
          longitude: payload.worksiteLongitude!,
        }
      : geocodedWorksite;
    const nextEnforceWorksiteRadius = payload.enforceWorksiteRadius;
    const nextMonthlyReportEnabled = payload.monthlyReportEnabled;
    const nextAccountantReportEmail = payload.accountantReportEmail;
    const nextWorksiteRadiusMeters = payload.worksiteRadiusMeters;
    const inputAddressNumber = extractAddressNumber(worksiteAddressInput);
    const geocodedAddressNumber = extractAddressNumber(geocodedWorksite?.addressText);

    if (nextEnforceWorksiteRadius && worksiteAddressInput && !resolvedWorksite) {
      return NextResponse.json(
        { error: "Nao foi possivel localizar esse endereco. Revise os dados e tente novamente." },
        { status: 400 },
      );
    }

    if (nextEnforceWorksiteRadius && !worksiteAddressInput && !currentOrganization.worksiteAddress) {
      return NextResponse.json(
        { error: "Informe o endereco base para ativar a validacao por raio." },
        { status: 400 },
      );
    }

    if (
      nextEnforceWorksiteRadius &&
      worksiteAddressInput &&
      geocodedWorksite &&
      inputAddressNumber &&
      geocodedAddressNumber &&
      inputAddressNumber !== geocodedAddressNumber
    ) {
      return NextResponse.json(
        {
          error:
            `O mapa localizou um endereco com numero ${geocodedAddressNumber}, diferente do numero ${inputAddressNumber} informado. ` +
            "Revise o endereco ou informe mais detalhes antes de salvar.",
        },
        { status: 400 },
      );
    }

    const organization = await db.organization.update({
      where: { id: session.organizationId },
      data: {
        accountantReportEmail: nextAccountantReportEmail,
        monthlyReportEnabled: nextMonthlyReportEnabled,
        enforceWorksiteRadius: nextEnforceWorksiteRadius,
        worksiteAddress:
          payload.worksiteAddress !== undefined
            ? worksiteAddressInput
            : currentOrganization.worksiteAddress,
        worksiteLatitude:
          payload.worksiteAddress !== undefined
            ? resolvedWorksite?.latitude ?? null
            : currentOrganization.worksiteLatitude,
        worksiteLongitude:
          payload.worksiteAddress !== undefined
            ? resolvedWorksite?.longitude ?? null
            : currentOrganization.worksiteLongitude,
        worksiteRadiusMeters: nextWorksiteRadiusMeters,
        worksiteGeocodingProvider:
          payload.worksiteAddress !== undefined
            ? resolvedWorksite?.provider ?? null
            : currentOrganization.worksiteGeocodingProvider,
      },
    });

    await auditLogRepository.create({
      organizationId: session.organizationId,
      actorUserId: session.sub,
      action: "organization_settings_updated",
      targetType: "organization",
      targetId: organization.id,
      metadataJson: {
        accountantReportEmail: organization.accountantReportEmail ?? "",
        monthlyReportEnabled: organization.monthlyReportEnabled,
        enforceWorksiteRadius: organization.enforceWorksiteRadius,
        worksiteAddress: organization.worksiteAddress ?? "",
        worksiteLatitude: organization.worksiteLatitude?.toString() ?? null,
        worksiteLongitude: organization.worksiteLongitude?.toString() ?? null,
        worksiteRadiusMeters: organization.worksiteRadiusMeters,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: error.issues[0]?.message ?? "Nao foi possivel validar as configuracoes.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nao foi possivel salvar as configuracoes.",
      },
      { status: 400 },
    );
  }
}
