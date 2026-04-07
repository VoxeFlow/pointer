import {
  BillingProvider,
  BillingSubscriptionStatus,
  OrganizationPlan,
  OrganizationStatus,
  Prisma,
  UpgradeRequestStatus,
} from "@prisma/client";
import Stripe from "stripe";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getStripeClient, getStripePriceId } from "@/lib/billing/stripe";
import { planCapacities } from "@/lib/plan";
import { auditLogRepository } from "@/repositories/audit-log-repository";

function mapStripeSubscriptionStatus(status?: Stripe.Subscription.Status | null): BillingSubscriptionStatus {
  switch (status) {
    case "trialing":
      return BillingSubscriptionStatus.TRIALING;
    case "active":
      return BillingSubscriptionStatus.ACTIVE;
    case "past_due":
      return BillingSubscriptionStatus.PAST_DUE;
    case "canceled":
      return BillingSubscriptionStatus.CANCELED;
    case "unpaid":
      return BillingSubscriptionStatus.UNPAID;
    case "incomplete":
    case "incomplete_expired":
      return BillingSubscriptionStatus.INCOMPLETE;
    default:
      return BillingSubscriptionStatus.NONE;
  }
}

async function ensureStripeCustomer(organizationId: string) {
  const organization = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
  });

  if (organization.billingCustomerId) {
    return organization;
  }

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    name: organization.brandDisplayName || organization.name,
    email: organization.billingEmail || organization.contactEmail || undefined,
    metadata: {
      organizationId: organization.id,
      organizationSlug: organization.slug,
    },
  });

  return db.organization.update({
    where: { id: organization.id },
    data: {
      billingProvider: BillingProvider.STRIPE,
      billingCustomerId: customer.id,
    },
  });
}

function getPlanFromPriceId(priceId?: string | null): OrganizationPlan | undefined {
  if (!priceId) {
    return undefined;
  }

  const priceMap = {
    [env.POINTER_STRIPE_PRICE_STARTER ?? ""]: OrganizationPlan.STARTER,
    [env.POINTER_STRIPE_PRICE_PRO ?? ""]: OrganizationPlan.PRO,
    [env.POINTER_STRIPE_PRICE_ENTERPRISE ?? ""]: OrganizationPlan.ENTERPRISE,
  };

  return priceMap[priceId];
}

function getSubscriptionPlan(subscription: Stripe.Subscription, desiredPlan?: OrganizationPlan) {
  if (desiredPlan) {
    return desiredPlan;
  }

  const item = subscription.items.data[0];
  return getPlanFromPriceId(item?.price?.id) ?? undefined;
}

function getSubscriptionCurrentPeriodEndsAt(subscription: Stripe.Subscription) {
  const periodEnd = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number")
    .sort((current, next) => next - current)[0];

  return periodEnd ? new Date(periodEnd * 1000) : null;
}

function resolveOrganizationStatusFromBilling(
  currentStatus: OrganizationStatus,
  billingStatus: BillingSubscriptionStatus,
  billingDelinquentSince?: Date | null,
) {
  if (billingStatus === BillingSubscriptionStatus.ACTIVE || billingStatus === BillingSubscriptionStatus.TRIALING) {
    return OrganizationStatus.ACTIVE;
  }

  if (billingStatus === BillingSubscriptionStatus.CANCELED || billingStatus === BillingSubscriptionStatus.UNPAID) {
    return OrganizationStatus.SUSPENDED;
  }

  if (
    billingStatus === BillingSubscriptionStatus.PAST_DUE ||
    billingStatus === BillingSubscriptionStatus.INCOMPLETE
  ) {
    if (currentStatus === OrganizationStatus.SUSPENDED) {
      return OrganizationStatus.SUSPENDED;
    }

    if (!billingDelinquentSince) {
      return currentStatus;
    }

    const graceWindowMs = env.POINTER_BILLING_GRACE_DAYS * 24 * 60 * 60 * 1000;
    const delinquentMs = Date.now() - billingDelinquentSince.getTime();

    if (delinquentMs >= graceWindowMs) {
      return OrganizationStatus.SUSPENDED;
    }
  }

  return currentStatus;
}

async function syncOrganizationStatusFromBilling(params: {
  organizationId: string;
  billingStatus: BillingSubscriptionStatus;
  sourceEventType: string;
  billingDelinquentSince?: Date | null;
}) {
  const organization = await db.organization.findUniqueOrThrow({
    where: { id: params.organizationId },
    select: {
      status: true,
      billingDelinquentSince: true,
    },
  });

  const nextStatus = resolveOrganizationStatusFromBilling(
    organization.status,
    params.billingStatus,
    params.billingDelinquentSince ?? organization.billingDelinquentSince,
  );

  if (nextStatus === organization.status) {
    return nextStatus;
  }

  await db.organization.update({
    where: { id: params.organizationId },
    data: {
      status: nextStatus,
    },
  });

  await auditLogRepository.create({
    organizationId: params.organizationId,
    action: "organization_status_synced_from_billing",
    targetType: "organization",
    targetId: params.organizationId,
    metadataJson: {
      previousStatus: organization.status,
      nextStatus,
      billingStatus: params.billingStatus,
      sourceEventType: params.sourceEventType,
    },
  });

  return nextStatus;
}

async function syncUpgradeRequestForPlan(params: {
  organizationId: string;
  desiredPlan?: OrganizationPlan;
  actorUserId?: string | null;
  billingStatus: BillingSubscriptionStatus;
}) {
  if (!params.desiredPlan) {
    return;
  }

  const nextStatus: UpgradeRequestStatus =
    params.billingStatus === BillingSubscriptionStatus.ACTIVE || params.billingStatus === BillingSubscriptionStatus.TRIALING
      ? UpgradeRequestStatus.CLOSED
      : UpgradeRequestStatus.CONTACTED;

  const latestRequest = await db.upgradeRequest.findFirst({
    where: {
      organizationId: params.organizationId,
      desiredPlan: params.desiredPlan,
      status: { in: ["OPEN", "CONTACTED"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!latestRequest || latestRequest.status === nextStatus) {
    return;
  }

  await db.upgradeRequest.update({
    where: { id: latestRequest.id },
    data: { status: nextStatus },
  });

  await auditLogRepository.create({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId ?? undefined,
    action: "upgrade_request_synced_from_billing",
    targetType: "upgrade_request",
    targetId: latestRequest.id,
    metadataJson: {
      desiredPlan: params.desiredPlan,
      billingStatus: params.billingStatus,
      nextStatus,
    },
  });
}

export const billingService = {
  async createCheckoutSession({
    organizationId,
    actorUserId,
    desiredPlan,
  }: {
    organizationId: string;
    actorUserId: string;
    desiredPlan: OrganizationPlan;
  }) {
    const stripe = getStripeClient();
    const organization = await ensureStripeCustomer(organizationId);
    const priceId = getStripePriceId(desiredPlan);

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: organization.billingCustomerId ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.POINTER_APP_URL}/admin/settings?billing=success`,
      cancel_url: `${env.POINTER_APP_URL}/admin/settings?billing=cancelled`,
      metadata: {
        organizationId,
        desiredPlan,
        actorUserId,
      },
      subscription_data: {
        metadata: {
          organizationId,
          desiredPlan,
        },
      },
      allow_promotion_codes: true,
    });

    await auditLogRepository.create({
      organizationId,
      actorUserId,
      action: "billing_checkout_created",
      targetType: "billing_checkout",
      metadataJson: {
        desiredPlan,
        checkoutSessionId: checkout.id,
      },
    });

    return checkout.url;
  },

  async createBillingPortalSession({
    organizationId,
    actorUserId,
  }: {
    organizationId: string;
    actorUserId: string;
  }) {
    const stripe = getStripeClient();
    const organization = await ensureStripeCustomer(organizationId);

    if (!organization.billingCustomerId) {
      throw new Error("Cliente billing ainda nao preparado para este tenant.");
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: organization.billingCustomerId,
      return_url: `${env.POINTER_APP_URL}/admin/settings`,
      configuration: env.POINTER_STRIPE_PORTAL_CONFIG_ID || undefined,
    });

    await auditLogRepository.create({
      organizationId,
      actorUserId,
      action: "billing_portal_created",
      targetType: "billing_portal",
    });

    return portal.url;
  },

  async listRecentInvoices(organizationId: string, limit = 6) {
    const organization = await db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: {
        billingCustomerId: true,
      },
    });

    if (!organization.billingCustomerId || !env.POINTER_STRIPE_SECRET_KEY) {
      return [];
    }

    const stripe = getStripeClient();
    const invoices = await stripe.invoices.list({
      customer: organization.billingCustomerId,
      limit,
    });

    return invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      currency: invoice.currency,
      amountPaid: invoice.amount_paid,
      amountDue: invoice.amount_due,
      createdAt: new Date(invoice.created * 1000).toISOString(),
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdf: invoice.invoice_pdf ?? null,
    }));
  },

  async recordStripeEvent(event: Stripe.Event, organizationId?: string | null) {
    await db.billingEvent.upsert({
      where: { providerEventId: event.id },
      update: {},
      create: {
        organizationId: organizationId ?? null,
        provider: BillingProvider.STRIPE,
        providerEventId: event.id,
        eventType: event.type,
        payloadJson: event as unknown as Prisma.InputJsonValue,
      },
    });
  },

  async processStripeEvent(event: Stripe.Event) {
    const object = event.data.object as unknown as Record<string, unknown>;
    const objectMetadata = (object.metadata ?? {}) as Record<string, string | undefined>;
    const stripe = getStripeClient();
    const organizationId =
      objectMetadata.organizationId ||
      (typeof object["customer"] === "string"
        ? (
            await db.organization.findFirst({
              where: { billingCustomerId: object["customer"] },
              select: { id: true },
            })
          )?.id
        : undefined);

    await this.recordStripeEvent(event, organizationId);

    if (!organizationId) {
      return;
    }

    if (
      event.type === "checkout.session.completed" ||
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscriptionFromEvent =
        event.type === "checkout.session.completed"
          ? null
          : (event.data.object as Stripe.Subscription);
      const checkoutSession =
        event.type === "checkout.session.completed"
          ? (event.data.object as Stripe.Checkout.Session)
          : null;
      const subscriptionId =
        subscriptionFromEvent?.id ||
        (typeof checkoutSession?.subscription === "string" ? checkoutSession.subscription : undefined);
      const subscription =
        subscriptionFromEvent ||
        (subscriptionId
          ? await stripe.subscriptions.retrieve(subscriptionId)
          : null);

      const desiredPlan = objectMetadata.desiredPlan as OrganizationPlan | undefined;
      const organization = await db.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { maxEmployees: true, status: true, billingDelinquentSince: true },
      });
      const subscriptionPlan = subscription
        ? getSubscriptionPlan(
            subscription,
            desiredPlan || (subscription.metadata?.desiredPlan as OrganizationPlan | undefined),
          )
        : desiredPlan;
      const billingStatus = mapStripeSubscriptionStatus(subscription?.status);
      const currentPeriodEndsAt = subscription ? getSubscriptionCurrentPeriodEndsAt(subscription) : null;
      const suggestedCapacity = subscriptionPlan ? planCapacities[subscriptionPlan] : undefined;
      const nextBillingDelinquentSince =
        billingStatus === BillingSubscriptionStatus.PAST_DUE || billingStatus === BillingSubscriptionStatus.INCOMPLETE
          ? organization.billingDelinquentSince ?? new Date()
          : null;
      const nextOrganizationStatus = resolveOrganizationStatusFromBilling(
        organization.status,
        billingStatus,
        nextBillingDelinquentSince,
      );

      await db.organization.update({
        where: { id: organizationId },
        data: {
          billingProvider: BillingProvider.STRIPE,
          billingCustomerId:
            typeof object["customer"] === "string"
              ? object["customer"]
              : undefined,
          billingEmail:
            typeof checkoutSession?.customer_details?.email === "string"
              ? checkoutSession.customer_details.email
              : undefined,
          billingSubscriptionId: subscriptionId,
          billingSubscriptionStatus: billingStatus,
          billingCurrentPeriodEndsAt: currentPeriodEndsAt,
          billingDelinquentSince: nextBillingDelinquentSince,
          plan: subscriptionPlan || undefined,
          status: nextOrganizationStatus,
          maxEmployees:
            subscriptionPlan && suggestedCapacity && suggestedCapacity > organization.maxEmployees
              ? {
                  set: suggestedCapacity,
                }
              : undefined,
        },
      });

      if (nextOrganizationStatus !== organization.status) {
        await auditLogRepository.create({
          organizationId,
          action: "organization_status_synced_from_billing",
          targetType: "organization",
          targetId: organizationId,
          metadataJson: {
            previousStatus: organization.status,
            nextStatus: nextOrganizationStatus,
            billingStatus,
            billingDelinquentSince: nextBillingDelinquentSince?.toISOString() ?? "",
            sourceEventType: event.type,
          },
        });
      }

      await syncUpgradeRequestForPlan({
        organizationId,
        desiredPlan: subscriptionPlan,
        billingStatus,
      });

      await auditLogRepository.create({
        organizationId,
        action: "billing_subscription_synced",
        targetType: "billing_subscription",
        metadataJson: {
          eventType: event.type,
          desiredPlan: subscriptionPlan ?? "",
          billingStatus,
          currentPeriodEndsAt: currentPeriodEndsAt?.toISOString() ?? "",
          subscriptionId: subscriptionId ?? "",
        },
      });
    }

    if (
      event.type === "invoice.paid" ||
      event.type === "invoice.payment_succeeded" ||
      event.type === "invoice.payment_failed"
    ) {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceSubscription = invoice.parent?.subscription_details?.subscription;
      const subscriptionId =
        typeof invoiceSubscription === "string" ? invoiceSubscription : invoiceSubscription?.id;
      const subscription = subscriptionId ? await stripe.subscriptions.retrieve(subscriptionId) : null;
      const currentPeriodEndsAt = subscription ? getSubscriptionCurrentPeriodEndsAt(subscription) : null;
      const billingStatus =
        event.type === "invoice.payment_failed"
          ? BillingSubscriptionStatus.PAST_DUE
          : subscription
            ? mapStripeSubscriptionStatus(subscription.status)
            : BillingSubscriptionStatus.ACTIVE;
      const organization = await db.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: {
          billingDelinquentSince: true,
        },
      });
      const nextBillingDelinquentSince =
        billingStatus === BillingSubscriptionStatus.PAST_DUE || billingStatus === BillingSubscriptionStatus.INCOMPLETE
          ? organization.billingDelinquentSince ?? new Date()
          : null;
      const nextOrganizationStatus = await syncOrganizationStatusFromBilling({
        organizationId,
        billingStatus,
        sourceEventType: event.type,
        billingDelinquentSince: nextBillingDelinquentSince,
      });

      await db.organization.update({
        where: { id: organizationId },
        data: {
          billingProvider: BillingProvider.STRIPE,
          billingCustomerId:
            typeof invoice.customer === "string"
              ? invoice.customer
              : invoice.customer?.id,
          billingEmail: invoice.customer_email ?? undefined,
          billingSubscriptionId: subscriptionId ?? undefined,
          billingSubscriptionStatus: billingStatus,
          billingCurrentPeriodEndsAt: currentPeriodEndsAt,
          billingDelinquentSince: nextBillingDelinquentSince,
          status: nextOrganizationStatus,
        },
      });

      await auditLogRepository.create({
        organizationId,
        action: event.type === "invoice.payment_failed" ? "billing_invoice_failed" : "billing_invoice_paid",
        targetType: "billing_invoice",
        targetId: invoice.id,
        metadataJson: {
          eventType: event.type,
          amountPaid: invoice.amount_paid,
          amountDue: invoice.amount_due,
          currency: invoice.currency,
          invoiceStatus: invoice.status ?? "",
          subscriptionId: subscriptionId ?? "",
        },
      });
    }
  },
};
