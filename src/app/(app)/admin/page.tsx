import Link from "next/link";

import { OnboardingChecklist } from "@/components/admin/onboarding-checklist";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { planDescriptions, planLabels } from "@/lib/plan";
import { countPresentEmployees, getRealtimeAttendanceIssue, getTodayWorkSummary } from "@/lib/time";
import { billingService } from "@/services/billing-service";

function getBillingStatusLabel(status: string) {
  return {
    NONE: "Sem assinatura ativa",
    TRIALING: "Assinatura em trial",
    ACTIVE: "Assinatura ativa",
    PAST_DUE: "Pagamento pendente",
    CANCELED: "Assinatura cancelada",
    UNPAID: "Pagamento em aberto",
    INCOMPLETE: "Assinatura incompleta",
  }[status] ?? status;
}

function formatMoney(currency: string, amountInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100);
}

export default async function AdminDashboardPage() {
  const session = await requireRole("ADMIN");
  const [organization, employees, recordsToday, invoices] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: session.organizationId } }),
    db.user.findMany({
      where: { organizationId: session.organizationId, role: "EMPLOYEE" },
      include: {
        schedule: {
          include: {
            weekdays: true,
          },
        },
        timeRecords: {
          where: {
            isDisregarded: false,
            serverTimestamp: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lte: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        },
      },
    }),
    db.timeRecord.findMany({
      where: {
        organizationId: session.organizationId,
        isDisregarded: false,
        serverTimestamp: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      include: { user: true },
      orderBy: { serverTimestamp: "desc" },
    }),
    billingService.listRecentInvoices(session.organizationId, 1).catch(() => []),
  ]);

  const presentToday = countPresentEmployees(employees);
  const employeeDaySummaries = employees.map((employee) => getTodayWorkSummary(employee.timeRecords, employee.schedule, new Date()));
  const employeesWithRealtimeIssues = employees
    .map((employee) => ({
      employee,
      issue: getRealtimeAttendanceIssue(employee.timeRecords, employee.schedule, new Date()),
    }))
    .filter(
      (
        item,
      ): item is {
        employee: (typeof employees)[number];
        issue: NonNullable<ReturnType<typeof getRealtimeAttendanceIssue>>;
      } => item.issue !== null,
    );
  const missingEntryCount = employeesWithRealtimeIssues.filter((item) => item.issue.code === "MISSING_ENTRY").length;
  const employeesWithOvertime = employeeDaySummaries.filter((summary) => summary.extraMinutes > 0).length;
  const employeesPendingHours = employeeDaySummaries.filter((summary) => summary.isWorkingDay && summary.missingMinutes > 0).length;
  const inconsistentCount = recordsToday.filter((record) => record.isInconsistent).length;
  const withPhoto = recordsToday.filter((record) => Boolean(record.photoUrl)).length;
  const withGeo = recordsToday.filter((record) => Boolean(record.latitude && record.longitude)).length;
  const employeeUsagePercent = organization.maxEmployees > 0 ? Math.min(100, Math.round((employees.length / organization.maxEmployees) * 100)) : 0;
  const latestInvoice = invoices[0] ?? null;
  const financialAttention =
    organization.billingSubscriptionStatus === "PAST_DUE" || organization.billingSubscriptionStatus === "UNPAID";
  const graceRemainingDays = organization.billingDelinquentSince
    ? Math.max(
        0,
        Math.ceil(
          (organization.billingDelinquentSince.getTime() + env.POINTER_BILLING_GRACE_DAYS * 24 * 60 * 60 * 1000 - Date.now()) /
            (24 * 60 * 60 * 1000),
        ),
      )
    : null;
  const onboardingItems = [
    {
      id: "settings",
      title: "Revisar politicas da organizacao",
      description: "Confira jornada padrao, limites e politicas basicas do Pointer para este cliente.",
      done: true,
      href: "/admin/settings",
    },
    {
      id: "employees",
      title: "Cadastrar pelo menos um funcionario",
      description: "Tenha ao menos um colaborador pronto para testar o fluxo de ponto no ambiente real.",
      done: employees.length > 0,
      href: "/admin/employees",
    },
    {
      id: "reports",
      title: "Configurar o relatorio mensal do contador",
      description: "Defina o e-mail do contador e habilite o envio automatico do consolidado.",
      done: Boolean(organization.accountantReportEmail && organization.monthlyReportEnabled),
      href: "/admin/settings",
    },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5">
      <section className="rounded-[2rem] border border-white/8 bg-[#161616] p-5 text-white shadow-none">
        <p className="text-sm text-white/70">{organization.name}</p>
        <h1 className="mt-2 text-3xl font-semibold">Dashboard administrativo</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/80">
          Visao rapida do dia com foco em presenca, confiabilidade do registro e inconsistencias que precisam de
          acompanhamento.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.25rem] border border-white/10 bg-[#242424] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">Plano</p>
            <p className="mt-2 text-lg font-semibold">{planLabels[organization.plan]}</p>
            <p className="mt-1 text-sm text-white/68">{planDescriptions[organization.plan]}</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/10 bg-[#242424] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">Status</p>
            <p className="mt-2 text-lg font-semibold">{organization.status}</p>
            <p className="mt-1 text-sm text-white/68">
              {organization.status === "TRIAL" ? "Ambiente em avaliacao comercial." : "Operacao com estado controlado por tenant."}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-white/10 bg-[#242424] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">Capacidade</p>
            <p className="mt-2 text-lg font-semibold">
              {employees.length}/{organization.maxEmployees} funcionarios
            </p>
            <div className="mt-3 h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-highlight" style={{ width: `${employeeUsagePercent}%` }} />
            </div>
          </div>
        </div>
      </section>

      <OnboardingChecklist
        items={onboardingItems}
        completedAt={organization.onboardingCompletedAt?.toISOString() ?? null}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Funcionarios", value: employees.length },
          { label: "Presentes hoje", value: presentToday },
          { label: "Sem entrada", value: missingEntryCount },
          { label: "Pendencias agora", value: employeesWithRealtimeIssues.length },
          { label: "Saldo pendente", value: employeesPendingHours },
          { label: "Hora extra", value: employeesWithOvertime },
          { label: "Inconsistencias", value: inconsistentCount },
          {
            label: "Foto / Geo",
            value: `${recordsToday.length ? Math.round((withPhoto / recordsToday.length) * 100) : 0}% / ${
              recordsToday.length ? Math.round((withGeo / recordsToday.length) * 100) : 0
            }%`,
          },
        ].map((item) => (
          <article
            key={item.label}
            className="glass rounded-[1.5rem] border border-black/5 bg-white p-4"
          >
            <p className="text-sm uppercase tracking-[0.14em] text-muted">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="glass rounded-[2rem] border border-black/5 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Assinatura do Pointer</p>
              <h2 className="mt-2 text-xl font-semibold">{getBillingStatusLabel(organization.billingSubscriptionStatus)}</h2>
              <p className="mt-2 text-sm text-muted">
                Resumo da cobranca pelo uso do Pointer nesta empresa, separado da operacao de ponto.
              </p>
            </div>
            <Link href="/admin/settings" className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold">
              Gerenciar assinatura
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.25rem] border border-border/80 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Ultima cobranca</p>
              <p className="mt-2 text-lg font-semibold">
                {latestInvoice ? formatMoney(latestInvoice.currency, latestInvoice.amountPaid) : "Sem cobranca"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {latestInvoice
                  ? `${latestInvoice.status || "registrada"} em ${new Date(latestInvoice.createdAt).toLocaleDateString("pt-BR")}`
                  : "Nenhuma fatura sincronizada ainda"}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-border/80 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Proxima renovacao</p>
              <p className="mt-2 text-lg font-semibold">
                {organization.billingCurrentPeriodEndsAt
                  ? organization.billingCurrentPeriodEndsAt.toLocaleDateString("pt-BR")
                  : "Nao sincronizada"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {organization.billingEmail
                  ? `Cobranca enviada para ${organization.billingEmail}`
                  : "E-mail financeiro ainda nao sincronizado"}
              </p>
            </div>
            <div className={`rounded-[1.25rem] border p-4 ${financialAttention ? "border-amber-300 bg-amber-50" : "border-border/80 bg-white"}`}>
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Saude financeira</p>
              <p className="mt-2 text-lg font-semibold">{financialAttention ? "Requer atencao" : "Saudavel"}</p>
              <p className="mt-1 text-sm text-muted">
                {financialAttention
                  ? "Existe cobranca pendente ou risco de inadimplencia na assinatura."
                  : "A assinatura nao mostra pendencias financeiras no momento."}
              </p>
              {organization.billingSubscriptionStatus === "PAST_DUE" || organization.billingSubscriptionStatus === "INCOMPLETE" ? (
                <p className="mt-2 text-sm font-medium text-amber-900">
                  {graceRemainingDays !== null
                    ? `${graceRemainingDays} dia(s) restantes antes de suspensao automatica.`
                    : "Carencia financeira em acompanhamento."}
                </p>
              ) : null}
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] border border-white/8 bg-[#161616] p-5 text-white shadow-none">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Comercial</p>
          <h2 className="mt-2 text-xl font-semibold">Plano {planLabels[organization.plan]}</h2>
          <p className="mt-2 text-sm text-white/75">{planDescriptions[organization.plan]}</p>
          <div className="mt-5 grid gap-3">
            <div className="rounded-[1.2rem] border border-white/10 bg-[#242424] p-4">
              <p className="text-sm text-white/62">Capacidade contratada</p>
              <p className="mt-2 text-lg font-semibold">{organization.maxEmployees} funcionarios</p>
            </div>
            <div className="rounded-[1.2rem] border border-white/10 bg-[#242424] p-4">
              <p className="text-sm text-white/62">Uso atual</p>
              <p className="mt-2 text-lg font-semibold">{employees.length} funcionarios ativos no tenant</p>
            </div>
            <Link
              href="/admin/settings"
              className="rounded-[1.2rem] bg-highlight px-4 py-3 text-center font-semibold text-brand transition hover:opacity-95"
            >
              Revisar plano e upgrade
            </Link>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="glass rounded-[2rem] border border-black/5 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Ultimos registros</h2>
            <Link href="/admin/records" className="text-sm font-semibold text-brand">
              Ver todos
            </Link>
          </div>
          <div className="mt-4 grid gap-3">
            {recordsToday.slice(0, 6).map((record) => (
              <div key={record.id} className="rounded-[1.25rem] border border-border/80 bg-white p-4 shadow-[0_12px_28px_rgba(0,0,0,0.04)]">
                <p className="font-semibold">{record.user.name}</p>
                <p className="mt-1 text-sm text-muted">
                  {record.recordType} • {record.serverTimestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="glass rounded-[2rem] border border-black/5 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Faltas de marcação em tempo real</h2>
            <span className="text-sm font-semibold text-muted">{employeesWithRealtimeIssues.length} alerta(s)</span>
          </div>
          <div className="mt-4 grid gap-3">
            {employeesWithRealtimeIssues.length > 0 ? (
              employeesWithRealtimeIssues.slice(0, 8).map(({ employee, issue }) => (
                <div key={employee.id} className="rounded-[1.25rem] border border-border/80 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{employee.name}</p>
                      <p className="mt-1 text-sm text-muted">{issue.title}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                      issue.severity === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {issue.severity === "critical" ? "Critico" : "Atencao"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted">{issue.description}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.25rem] border border-border/80 bg-white px-4 py-5 text-sm text-muted shadow-[0_12px_28px_rgba(0,0,0,0.04)]">
                Nenhuma falta de marcação em tempo real neste momento.
              </div>
            )}
          </div>
        </article>

        <article className="glass rounded-[2rem] border border-black/5 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Acoes rapidas</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {[
              { href: "/admin/employees", label: "Gerenciar funcionarios" },
              { href: "/admin/records", label: "Auditar registros" },
              { href: "/admin/reports", label: "Exportar CSV" },
              { href: "/admin/settings", label: "Revisar politicas" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[1.25rem] border border-border/80 bg-white px-4 py-4 font-semibold shadow-[0_12px_28px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:bg-[#fcfbf9]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
