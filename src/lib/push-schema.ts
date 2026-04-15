import { db } from "@/lib/db";

declare global {
  var pointerPushSchemaReady: boolean | undefined;
}

export async function ensurePushSchema() {
  if (global.pointerPushSchemaReady) {
    return;
  }

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "push_subscriptions" (
      "id" TEXT NOT NULL,
      "organization_id" TEXT NOT NULL,
      "user_id" TEXT NOT NULL,
      "endpoint" TEXT NOT NULL,
      "p256dh" TEXT NOT NULL,
      "auth" TEXT NOT NULL,
      "user_agent" TEXT,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "last_seen_at" TIMESTAMP(3),
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "push_subscriptions_organization_id_fkey"
        FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "push_subscriptions_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await db.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_key"
      ON "push_subscriptions"("endpoint");
  `);

  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "push_subscriptions_organization_id_user_id_is_active_idx"
      ON "push_subscriptions"("organization_id", "user_id", "is_active");
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "push_reminder_deliveries" (
      "id" TEXT NOT NULL,
      "organization_id" TEXT NOT NULL,
      "user_id" TEXT NOT NULL,
      "subscription_id" TEXT NOT NULL,
      "issue_code" TEXT NOT NULL,
      "issue_date_key" TEXT NOT NULL,
      "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "push_reminder_deliveries_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "push_reminder_deliveries_organization_id_fkey"
        FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "push_reminder_deliveries_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "push_reminder_deliveries_subscription_id_fkey"
        FOREIGN KEY ("subscription_id") REFERENCES "push_subscriptions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await db.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "push_reminder_deliveries_subscription_id_issue_code_issue_date_idx"
      ON "push_reminder_deliveries"("subscription_id", "issue_code", "issue_date_key");
  `);

  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "push_reminder_deliveries_organization_id_user_id_sent_at_idx"
      ON "push_reminder_deliveries"("organization_id", "user_id", "sent_at");
  `);

  global.pointerPushSchemaReady = true;
}
