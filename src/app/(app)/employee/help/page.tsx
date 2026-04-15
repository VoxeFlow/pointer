import { DeviceConsentSettingsForm } from "@/components/employee/device-consent-settings-form";
import { InstallCTA } from "@/components/pwa/install-cta";
import { hasActiveDeviceConsent, hasActiveImageConsent } from "@/lib/consent";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export default async function EmployeeHelpPage() {
  const session = await requireRole("EMPLOYEE");
  const user = await db.user.findUniqueOrThrow({
    where: { id: session.sub },
    select: {
      deviceConsentAcceptedAt: true,
      deviceConsentRevokedAt: true,
      deviceConsentVersion: true,
      imageConsentAcceptedAt: true,
      imageConsentRevokedAt: true,
      imageConsentVersion: true,
    },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5">
      <section className="glass rounded-[2rem] p-5">
        <h1 className="text-2xl font-semibold">Ajuda e instalacao</h1>
        <p className="mt-2 text-sm text-muted">
          O Pointer funciona melhor quando esta na tela inicial do aparelho. Se camera ou localizacao nao estiverem
          liberadas, o proprio fluxo orienta como ativar.
        </p>
      </section>
      <DeviceConsentSettingsForm
        consentActive={hasActiveDeviceConsent(user)}
        consentAcceptedAt={user.deviceConsentAcceptedAt?.toISOString() ?? null}
        imageConsentActive={hasActiveImageConsent(user)}
        imageConsentAcceptedAt={user.imageConsentAcceptedAt?.toISOString() ?? null}
      />
      <InstallCTA standaloneOnly={false} />
    </div>
  );
}
