import { BrandingSettingsForm } from "@/components/admin/branding-settings-form";
import { BillingHistory } from "@/components/admin/billing-history";
import { BillingPanel } from "@/components/admin/billing-panel";
import { UpgradeRequestForm } from "@/components/admin/upgrade-request-form";
import { CommercialSettingsForm } from "@/components/admin/commercial-settings-form";
import { ReportSettingsForm } from "@/components/admin/report-settings-form";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getTenantPublicUrl } from "@/lib/tenant";
import { formatDailyWorkload } from "@/lib/utils";
import { billingService } from "@/services/billing-service";

export default async function AdminSettingsPage() {
  const session = await requireRole("ADMIN");
  const [organization, latestUpgradeRequest, upgradeRequests, billingEvents, invoices] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: session.organizationId },
    }),
    db.upgradeRequest.findFirst({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
    }),
    db.upgradeRequest.findMany({
      where: { organizationId: session.organizationId },
      include: {
        requestedBy: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.billingEvent.findMany({
      where: { organizationId: session.organizationId },
      select: {
        id: true,
        eventType: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    billingService.listRecentInvoices(session.organizationId).catch(() => []),
  ]);
  const latestInvoice = invoices[0] ?? null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      <section className="glass rounded-[2rem] p-5">
        <h1 className="text-2xl font-semibold">Configuracoes</h1>
        <div className="mt-5 grid gap-4 text-sm text-muted sm:grid-cols-2">
          <p>Status da organizacao: {organization.status}</p>
          <p>Plano atual: {organization.plan}</p>
          <p>Capacidade de funcionarios: {organization.maxEmployees}</p>
          <p>Fim do trial: {organization.trialEndsAt ? organization.trialEndsAt.toLocaleDateString("pt-BR") : "Nao definido"}</p>
          <p>Jornada diária padrão: {formatDailyWorkload(organization.defaultDailyWorkloadMin)}</p>
          <p>Tolerancia de atraso: {organization.defaultLateToleranceMin} minutos</p>
          <p>Intervalo minimo: {organization.defaultBreakMinMinutes} minutos</p>
          <p>Maximo de registros por dia: {organization.maxRecordsPerDay}</p>
          <p>Foto obrigatoria: {organization.requirePhoto ? "Sim" : "Nao"}</p>
          <p>Geolocalizacao obrigatoria: {organization.requireGeolocation ? "Sim" : "Nao"}</p>
          <p>Fallback por galeria: {organization.allowGalleryFallback ? "Permitido" : "Bloqueado"}</p>
          <p>Registros extraordinarios: {organization.allowExtraordinaryRecords ? "Permitidos" : "Bloqueados"}</p>
        </div>
        <p className="mt-5 text-xs text-muted">
          Regra geral aplicada no Pointer: até 8 horas diárias, 44 horas semanais, intervalo mínimo conforme duração da jornada
          e descanso mínimo de 11 horas entre jornadas. Casos especiais dependem de convenção, acordo ou regime específico.
        </p>
      </section>

      <section className="glass mt-4 rounded-[2rem] p-5">
        <h2 className="text-lg font-semibold">Plano e capacidade</h2>
        <p className="mt-2 text-sm text-muted">
          Estes controles deixam o Pointer mais pronto para venda, permitindo limitar operacao por tenant sem acoplamento com billing agora.
        </p>
        <div className="mt-5">
          <CommercialSettingsForm
            status={organization.status}
            plan={organization.plan}
            maxEmployees={organization.maxEmployees}
          />
        </div>
      </section>

      <section className="glass mt-4 rounded-[2rem] p-5">
        <h2 className="text-lg font-semibold">Branding da organizacao</h2>
        <p className="mt-2 text-sm text-muted">
          Defina identidade visual do tenant para demonstracoes e operacao por cliente, mantendo a base Pointer como plataforma.
        </p>
        <div className="mt-5">
          <BrandingSettingsForm
            brandDisplayName={organization.brandDisplayName}
            brandLogoUrl={organization.brandLogoUrl}
            brandPrimaryColor={organization.brandPrimaryColor}
            brandAccentColor={organization.brandAccentColor}
          />
        </div>
        <div className="mt-5 rounded-[1.25rem] border border-border/80 bg-white/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Entrada do tenant</p>
          <p className="mt-2 break-all text-sm font-semibold">{getTenantPublicUrl(organization.slug)}</p>
          <p className="mt-2 text-sm text-muted">Fallback do MVP: {`/t/${organization.slug}`}</p>
        </div>
      </section>

      <UpgradeRequestForm
        currentPlan={organization.plan}
        latestRequestStatus={latestUpgradeRequest?.status ?? null}
      />

      <BillingPanel
        currentPlan={organization.plan}
        billingEnabled={Boolean(env.POINTER_STRIPE_SECRET_KEY)}
        billingStatus={organization.billingSubscriptionStatus}
        currentPeriodEndsAt={organization.billingCurrentPeriodEndsAt?.toISOString() ?? null}
        billingEmail={organization.billingEmail}
        latestInvoiceStatus={latestInvoice?.status ?? null}
        latestInvoiceCreatedAt={latestInvoice?.createdAt ?? null}
        latestInvoiceAmountPaid={latestInvoice?.amountPaid ?? null}
        latestInvoiceCurrency={latestInvoice?.currency ?? null}
        billingDelinquentSince={organization.billingDelinquentSince?.toISOString() ?? null}
        billingGraceDays={env.POINTER_BILLING_GRACE_DAYS}
      />

      <BillingHistory
        billingStatus={organization.billingSubscriptionStatus}
        billingEmail={organization.billingEmail}
        billingCustomerId={organization.billingCustomerId}
        billingSubscriptionId={organization.billingSubscriptionId}
        upgradeRequests={upgradeRequests.map((request) => ({
          id: request.id,
          currentPlan: request.currentPlan,
          desiredPlan: request.desiredPlan,
          status: request.status,
          message: request.message,
          createdAt: request.createdAt.toISOString(),
          requestedByName: request.requestedBy?.name ?? null,
        }))}
        billingEvents={billingEvents.map((event) => ({
          id: event.id,
          eventType: event.eventType,
          createdAt: event.createdAt.toISOString(),
        }))}
        invoices={invoices}
      />

      <section className="glass mt-4 rounded-[2rem] p-5">
        <h2 className="text-lg font-semibold">Relatorio mensal para o contador</h2>
        <p className="mt-2 text-sm text-muted">
          Quando habilitado, o Pointer gera no dia 1 um consolidado do mes anterior e envia para o e-mail do contador
          usando um SMTP exclusivo deste projeto.
        </p>
        <div className="mt-5">
          <ReportSettingsForm
            accountantReportEmail={organization.accountantReportEmail}
            monthlyReportEnabled={organization.monthlyReportEnabled}
          />
        </div>
        <p className="mt-4 text-xs text-muted">
          Agendamento padrao do deploy: dia 1 as 11:00 UTC, equivalente a 08:00 em America/Sao_Paulo.
        </p>
      </section>
    </div>
  );
}
