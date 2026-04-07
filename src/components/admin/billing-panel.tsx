"use client";

import { OrganizationPlan } from "@prisma/client";
import { useState } from "react";

import { planCapacities, planDescriptions, planHighlights, planLabels } from "@/lib/plan";

type BillingPanelProps = {
  currentPlan: OrganizationPlan;
  billingEnabled: boolean;
  billingStatus: string;
  currentPeriodEndsAt: string | null;
  billingEmail: string | null;
  latestInvoiceStatus: string | null;
  latestInvoiceCreatedAt: string | null;
  latestInvoiceAmountPaid: number | null;
  latestInvoiceCurrency: string | null;
  billingDelinquentSince: string | null;
  billingGraceDays: number;
};

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

export function BillingPanel({
  currentPlan,
  billingEnabled,
  billingStatus,
  currentPeriodEndsAt,
  billingEmail,
  latestInvoiceStatus,
  latestInvoiceCreatedAt,
  latestInvoiceAmountPaid,
  latestInvoiceCurrency,
  billingDelinquentSince,
  billingGraceDays,
}: BillingPanelProps) {
  const [checkoutPending, setCheckoutPending] = useState<string | null>(null);
  const [portalPending, setPortalPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout(plan: OrganizationPlan) {
    setCheckoutPending(plan);
    setError(null);

    const response = await fetch("/api/admin/billing/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ desiredPlan: plan }),
    });

    const body = (await response.json()) as { error?: string; url?: string };
    setCheckoutPending(null);

    if (!response.ok || !body.url) {
      setError(body.error ?? "Nao foi possivel iniciar o checkout.");
      return;
    }

    window.location.href = body.url;
  }

  async function handlePortal() {
    setPortalPending(true);
    setError(null);

    const response = await fetch("/api/admin/billing/portal", {
      method: "POST",
    });

    const body = (await response.json()) as { error?: string; url?: string };
    setPortalPending(false);

    if (!response.ok || !body.url) {
      setError(body.error ?? "Nao foi possivel abrir o portal de billing.");
      return;
    }

    window.location.href = body.url;
  }

  const hasFinancialAttention = billingStatus === "PAST_DUE" || billingStatus === "UNPAID";
  const graceRemainingDays = billingDelinquentSince
    ? Math.max(
        0,
        Math.ceil(
          (new Date(billingDelinquentSince).getTime() + billingGraceDays * 24 * 60 * 60 * 1000 - Date.now()) /
            (24 * 60 * 60 * 1000),
        ),
      )
    : null;

  return (
    <section className="glass mt-4 rounded-[2rem] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Assinatura do Pointer</h2>
          <p className="mt-2 text-sm text-muted">
            Esta area controla a cobranca da empresa pelo uso do Pointer como sistema, nao os registros de ponto dos funcionarios.
          </p>
        </div>
        <div className="rounded-[1rem] border border-border bg-white/80 px-4 py-3 text-sm">
          <p className="font-semibold">{getBillingStatusLabel(billingStatus)}</p>
          <p className="mt-1 text-muted">
            {currentPeriodEndsAt
              ? `Proxima renovacao em ${new Date(currentPeriodEndsAt).toLocaleDateString("pt-BR")}`
              : "Sem renovacao sincronizada"}
          </p>
          <p className="mt-1 break-all text-muted">
            {billingEmail ? `Cobrancas enviadas para ${billingEmail}` : "E-mail financeiro ainda nao sincronizado"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.25rem] border border-border/80 bg-white/85 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Plano contratado</p>
          <p className="mt-2 text-lg font-semibold">{planLabels[currentPlan]}</p>
          <p className="mt-1 text-sm text-muted">Uso comercial do Pointer para esta organizacao.</p>
        </div>
        <div className="rounded-[1.25rem] border border-border/80 bg-white/85 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Ultima cobranca</p>
          <p className="mt-2 text-lg font-semibold">
            {latestInvoiceCurrency && typeof latestInvoiceAmountPaid === "number"
              ? formatMoney(latestInvoiceCurrency, latestInvoiceAmountPaid)
              : "Sem cobranca"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {latestInvoiceCreatedAt
              ? `${latestInvoiceStatus || "registrada"} em ${new Date(latestInvoiceCreatedAt).toLocaleDateString("pt-BR")}`
              : "Nenhuma fatura sincronizada ainda"}
          </p>
        </div>
        <div className={`rounded-[1.25rem] border p-4 ${hasFinancialAttention ? "border-amber-300 bg-amber-50" : "border-border/80 bg-white/85"}`}>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Atencao financeira</p>
          <p className="mt-2 text-lg font-semibold">
            {hasFinancialAttention ? "Acao recomendada" : "Operacao normal"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {hasFinancialAttention
              ? "Existe risco de bloqueio ou cobranca pendente. Vale revisar a forma de pagamento."
              : "Sem sinais atuais de inadimplencia na assinatura."}
          </p>
          {billingStatus === "PAST_DUE" || billingStatus === "INCOMPLETE" ? (
            <p className="mt-2 text-sm font-medium text-amber-900">
              {graceRemainingDays !== null
                ? `Carencia antes da suspensao: ${graceRemainingDays} dia(s).`
                : "Carencia em acompanhamento."}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {Object.values(OrganizationPlan).map((plan) => {
          const isCurrent = currentPlan === plan;
          return (
            <article
              key={plan}
              className={`rounded-[1.5rem] border p-4 ${
                isCurrent ? "border-brand bg-brand text-white" : "border-border/80 bg-white/80"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">{planLabels[plan]}</h3>
                {isCurrent ? (
                  <span className="rounded-full bg-highlight px-3 py-1 text-xs font-semibold text-brand">Atual</span>
                ) : null}
              </div>
              <p className={`mt-2 text-sm ${isCurrent ? "text-white/80" : "text-muted"}`}>{planDescriptions[plan]}</p>
              <p className={`mt-3 text-sm font-semibold ${isCurrent ? "text-white" : "text-foreground"}`}>
                Capacidade sugerida: {planCapacities[plan]} funcionarios
              </p>
              <div className="mt-4 grid gap-2 text-sm">
                {planHighlights[plan].map((highlight) => (
                  <p key={highlight}>{highlight}</p>
                ))}
              </div>
              {!isCurrent ? (
                <button
                  type="button"
                  onClick={() => handleCheckout(plan)}
                  disabled={!billingEnabled || checkoutPending === plan}
                  className="mt-5 w-full rounded-[1rem] bg-brand px-4 py-3 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-50"
                >
                  {checkoutPending === plan ? "Abrindo..." : "Assinar este plano"}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handlePortal}
          disabled={!billingEnabled || portalPending}
          className="rounded-[1rem] border border-border bg-white px-4 py-3 font-semibold"
        >
          {portalPending ? "Abrindo portal..." : "Gerenciar assinatura no portal"}
        </button>
        {!billingEnabled ? (
          <p className="text-sm text-muted">Configure as variaveis Stripe exclusivas do Pointer para habilitar a cobranca SaaS.</p>
        ) : null}
      </div>

      {error ? <p className="mt-4 rounded-[1rem] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
    </section>
  );
}
