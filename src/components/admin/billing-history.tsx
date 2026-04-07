"use client";

import { BillingSubscriptionStatus, OrganizationPlan, UpgradeRequestStatus } from "@prisma/client";

import { planLabels } from "@/lib/plan";
import { cn } from "@/lib/utils";

type UpgradeHistoryItem = {
  id: string;
  currentPlan: OrganizationPlan;
  desiredPlan: OrganizationPlan;
  status: UpgradeRequestStatus;
  message: string | null;
  createdAt: string;
  requestedByName: string | null;
};

type BillingEventItem = {
  id: string;
  eventType: string;
  createdAt: string;
};

type InvoiceItem = {
  id: string;
  number: string | null;
  status: string | null;
  currency: string;
  amountPaid: number;
  amountDue: number;
  createdAt: string;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
};

function getUpgradeStatusLabel(status: UpgradeRequestStatus) {
  return {
    OPEN: "Aberta",
    CONTACTED: "Em andamento",
    CLOSED: "Concluida",
  }[status];
}

function getBillingStatusLabel(status: BillingSubscriptionStatus | string) {
  return {
    NONE: "Sem assinatura",
    TRIALING: "Trial",
    ACTIVE: "Ativa",
    PAST_DUE: "Pagamento pendente",
    CANCELED: "Cancelada",
    UNPAID: "Nao paga",
    INCOMPLETE: "Incompleta",
  }[status] ?? status;
}

function getChipClass(tone: "neutral" | "success" | "warning") {
  return cn(
    "rounded-full px-3 py-1 text-xs font-semibold",
    tone === "success" && "bg-emerald-100 text-emerald-700",
    tone === "warning" && "bg-amber-100 text-amber-800",
    tone === "neutral" && "bg-slate-200 text-slate-700",
  );
}

function formatMoney(currency: string, amountInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100);
}

function getInvoiceStatusLabel(status: string | null) {
  return {
    draft: "Rascunho",
    open: "Aberta",
    paid: "Paga",
    uncollectible: "Inadimplente",
    void: "Cancelada",
  }[status ?? ""] ?? (status || "Sem status");
}

export function BillingHistory({
  billingStatus,
  billingEmail,
  billingCustomerId,
  billingSubscriptionId,
  upgradeRequests,
  billingEvents,
  invoices,
}: {
  billingStatus: BillingSubscriptionStatus;
  billingEmail: string | null;
  billingCustomerId: string | null;
  billingSubscriptionId: string | null;
  upgradeRequests: UpgradeHistoryItem[];
  billingEvents: BillingEventItem[];
  invoices: InvoiceItem[];
}) {
  const billingTone =
    billingStatus === "ACTIVE" || billingStatus === "TRIALING"
      ? "success"
      : billingStatus === "PAST_DUE" || billingStatus === "UNPAID"
        ? "warning"
        : "neutral";

  return (
    <section className="glass mt-4 rounded-[2rem] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Historico comercial da assinatura</h2>
          <p className="mt-2 text-sm text-muted">
            Aqui o admin acompanha a assinatura SaaS do Pointer para esta empresa, com upgrades, cobrancas e eventos financeiros.
          </p>
        </div>
        <span className={getChipClass(billingTone)}>{getBillingStatusLabel(billingStatus)}</span>
      </div>

      <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-[1.25rem] border border-border/80 bg-white/80 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">E-mail financeiro</p>
          <p className="mt-2 break-all font-semibold">{billingEmail || "Nao configurado"}</p>
        </div>
        <div className="rounded-[1.25rem] border border-border/80 bg-white/80 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Cliente Stripe</p>
          <p className="mt-2 break-all font-semibold">{billingCustomerId || "Ainda nao criado"}</p>
        </div>
        <div className="rounded-[1.25rem] border border-border/80 bg-white/80 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Assinatura Stripe</p>
          <p className="mt-2 break-all font-semibold">{billingSubscriptionId || "Sem assinatura ativa"}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <div className="rounded-[1.5rem] border border-border/80 bg-white/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Solicitacoes de upgrade</h3>
            <span className="text-xs uppercase tracking-[0.18em] text-muted">Ultimas 5</span>
          </div>

          <div className="mt-4 grid gap-3">
            {upgradeRequests.length ? (
              upgradeRequests.map((request) => (
                <article key={request.id} className="rounded-[1.2rem] border border-border/70 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold">
                      {planLabels[request.currentPlan]} para {planLabels[request.desiredPlan]}
                    </p>
                    <span
                      className={getChipClass(
                        request.status === "CLOSED"
                          ? "success"
                          : request.status === "CONTACTED"
                            ? "warning"
                            : "neutral",
                      )}
                    >
                      {getUpgradeStatusLabel(request.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {new Date(request.createdAt).toLocaleDateString("pt-BR")} por {request.requestedByName || "admin"}
                  </p>
                  {request.message ? <p className="mt-3 text-sm text-foreground">{request.message}</p> : null}
                </article>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-border bg-white/60 p-4 text-sm text-muted">
                Ainda nao existem solicitacoes comerciais registradas para esta organizacao.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border/80 bg-white/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Eventos financeiros</h3>
            <span className="text-xs uppercase tracking-[0.18em] text-muted">Ultimos 8</span>
          </div>

          <div className="mt-4 grid gap-3">
            {billingEvents.length ? (
              billingEvents.map((event) => (
                <article key={event.id} className="rounded-[1.2rem] border border-border/70 bg-white p-4">
                  <p className="font-semibold">{event.eventType}</p>
                  <p className="mt-2 text-sm text-muted">
                    {new Date(event.createdAt).toLocaleDateString("pt-BR")} as{" "}
                    {new Date(event.createdAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </article>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-border bg-white/60 p-4 text-sm text-muted">
                Nenhum evento financeiro foi sincronizado ainda.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border/80 bg-white/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Faturas recentes</h3>
            <span className="text-xs uppercase tracking-[0.18em] text-muted">Ultimas 6</span>
          </div>

          <div className="mt-4 grid gap-3">
            {invoices.length ? (
              invoices.map((invoice) => (
                <article key={invoice.id} className="rounded-[1.2rem] border border-border/70 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold">{invoice.number || invoice.id}</p>
                    <span
                      className={getChipClass(
                        invoice.status === "paid"
                          ? "success"
                          : invoice.status === "open" || invoice.status === "uncollectible"
                            ? "warning"
                            : "neutral",
                      )}
                    >
                      {getInvoiceStatusLabel(invoice.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {new Date(invoice.createdAt).toLocaleDateString("pt-BR")} • pago {formatMoney(invoice.currency, invoice.amountPaid)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    total devido {formatMoney(invoice.currency, invoice.amountDue)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    {invoice.hostedInvoiceUrl ? (
                      <a
                        href={invoice.hostedInvoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-border px-3 py-1.5 font-medium"
                      >
                        Ver fatura
                      </a>
                    ) : null}
                    {invoice.invoicePdf ? (
                      <a
                        href={invoice.invoicePdf}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-border px-3 py-1.5 font-medium"
                      >
                        Baixar PDF
                      </a>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-border bg-white/60 p-4 text-sm text-muted">
                Nenhuma fatura foi encontrada para este tenant.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
