import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { ensurePushSchema } from "@/lib/push-schema";
import { getWebPushPublicKey, isWebPushConfigured } from "@/lib/web-push";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function GET() {
  await requireSession();
  await ensurePushSchema();

  return NextResponse.json({
    enabled: isWebPushConfigured(),
    publicKey: getWebPushPublicKey(),
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  await ensurePushSchema();

  if (!isWebPushConfigured()) {
    return NextResponse.json({ error: "Web Push nao configurado no Pointer." }, { status: 503 });
  }

  const json = await request.json();
  const payload = subscriptionSchema.parse(json);

  await db.pushSubscription.upsert({
    where: { endpoint: payload.endpoint },
    update: {
      organizationId: session.organizationId,
      userId: session.sub,
      p256dh: payload.keys.p256dh,
      auth: payload.keys.auth,
      userAgent: request.headers.get("user-agent") ?? undefined,
      isActive: true,
      lastSeenAt: new Date(),
    },
    create: {
      organizationId: session.organizationId,
      userId: session.sub,
      endpoint: payload.endpoint,
      p256dh: payload.keys.p256dh,
      auth: payload.keys.auth,
      userAgent: request.headers.get("user-agent") ?? undefined,
      isActive: true,
      lastSeenAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  await ensurePushSchema();
  const json = await request.json().catch(() => null);
  const endpoint = z.string().url().safeParse(json?.endpoint);

  if (!endpoint.success) {
    return NextResponse.json({ error: "Endpoint invalido." }, { status: 400 });
  }

  await db.pushSubscription.updateMany({
    where: {
      organizationId: session.organizationId,
      userId: session.sub,
      endpoint: endpoint.data,
    },
    data: {
      isActive: false,
    },
  });

  return NextResponse.json({ success: true });
}
