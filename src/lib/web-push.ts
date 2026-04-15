import webpush, { type PushSubscription } from "web-push";

import { env } from "@/lib/env";

let configured = false;

function ensureConfigured() {
  if (configured) {
    return true;
  }

  if (!env.POINTER_WEB_PUSH_PUBLIC_KEY || !env.POINTER_WEB_PUSH_PRIVATE_KEY) {
    return false;
  }

  webpush.setVapidDetails(
    env.POINTER_WEB_PUSH_SUBJECT,
    env.POINTER_WEB_PUSH_PUBLIC_KEY,
    env.POINTER_WEB_PUSH_PRIVATE_KEY,
  );
  configured = true;
  return true;
}

export function isWebPushConfigured() {
  return Boolean(env.POINTER_WEB_PUSH_PUBLIC_KEY && env.POINTER_WEB_PUSH_PRIVATE_KEY && ensureConfigured());
}

export function getWebPushPublicKey() {
  return env.POINTER_WEB_PUSH_PUBLIC_KEY ?? null;
}

export async function sendWebPushNotification(
  subscription: PushSubscription,
  payload: Record<string, unknown>,
) {
  if (!ensureConfigured()) {
    throw new Error("Web Push nao configurado.");
  }

  return webpush.sendNotification(subscription, JSON.stringify(payload));
}
