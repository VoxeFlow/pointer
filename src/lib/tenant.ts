import { cache } from "react";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

export function extractTenantSlugFromHost(host: string | null) {
  if (!host) {
    return null;
  }

  const normalizedHost = host.split(":")[0].toLowerCase();
  const rootDomain = env.POINTER_ROOT_DOMAIN.split(":")[0].toLowerCase();

  if (
    normalizedHost === rootDomain ||
    normalizedHost === "localhost" ||
    normalizedHost === "127.0.0.1" ||
    normalizedHost === "www." + rootDomain
  ) {
    return null;
  }

  if (normalizedHost.endsWith(`.${rootDomain}`)) {
    const subdomain = normalizedHost.slice(0, -(rootDomain.length + 1));
    if (subdomain && subdomain !== "www") {
      return subdomain.split(".").pop() ?? null;
    }
  }

  return null;
}

export function getTenantPublicUrl(slug: string) {
  const appUrl = new URL(env.POINTER_APP_URL);
  const rootDomain = env.POINTER_ROOT_DOMAIN.split(":")[0];

  if (rootDomain === "localhost" || rootDomain.includes("localhost")) {
    return `${appUrl.origin}/t/${slug}`;
  }

  return `${appUrl.protocol}//${slug}.${rootDomain}`;
}

export const getOrganizationBySlug = cache(async (slug: string) => {
  return db.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      plan: true,
      brandDisplayName: true,
      brandLogoUrl: true,
      brandPrimaryColor: true,
      brandAccentColor: true,
      contactEmail: true,
      trialEndsAt: true,
      maxEmployees: true,
    },
  });
});
