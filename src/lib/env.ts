import { z } from "zod";

function emptyToUndefined(value: string | undefined) {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function normalizeAppUrl(value: string | undefined) {
  const raw = emptyToUndefined(value);
  if (!raw) return "http://localhost:3000";
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withProtocol).toString().replace(/\/$/, "");
  } catch {
    return "http://localhost:3000";
  }
}

function normalizeRootDomain(value: string | undefined) {
  const raw = emptyToUndefined(value);
  return raw ?? "localhost:3000";
}

function normalizeSessionSecret(value: string | undefined) {
  const raw = emptyToUndefined(value);
  if (!raw) return "pointer-local-development-secret-change-me-123";
  if (raw.length >= 32) return raw;
  return `${raw}${"-".repeat(32)}`.slice(0, 32);
}

function normalizeStorageDriver(value: string | undefined) {
  const raw = emptyToUndefined(value);
  if (raw === "local" || raw === "supabase" || raw === "cloudinary") {
    return raw;
  }
  return "local";
}

function normalizeGeocodingProvider(value: string | undefined) {
  const raw = emptyToUndefined(value);
  if (raw === "none" || raw === "nominatim") {
    return raw;
  }
  return "nominatim";
}

function normalizeSmtpSecure(value: string | undefined) {
  const raw = emptyToUndefined(value);
  if (!raw) return false;
  return raw === "true";
}

function normalizePositiveInt(value: string | undefined, fallback: number) {
  const raw = emptyToUndefined(value);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const asInt = Math.trunc(parsed);
  return asInt > 0 ? asInt : fallback;
}

function normalizeNonNegativeInt(value: string | undefined, fallback: number) {
  const raw = emptyToUndefined(value);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const asInt = Math.trunc(parsed);
  return asInt >= 0 ? asInt : fallback;
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  POINTER_APP_URL: z.string().default("http://localhost:3000"),
  POINTER_ROOT_DOMAIN: z.string().default("localhost:3000"),
  POINTER_SESSION_SECRET: z.string().min(32).default("pointer-local-development-secret-change-me-123"),
  POINTER_STORAGE_DRIVER: z.enum(["local", "supabase", "cloudinary"]).default("local"),
  POINTER_STORAGE_LOCAL_DIR: z.string().default("public/uploads"),
  POINTER_SUPABASE_URL: z.string().optional(),
  POINTER_SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  POINTER_SUPABASE_BUCKET: z.string().default("pointer-photos"),
  POINTER_CLOUDINARY_CLOUD_NAME: z.string().optional(),
  POINTER_CLOUDINARY_API_KEY: z.string().optional(),
  POINTER_CLOUDINARY_API_SECRET: z.string().optional(),
  POINTER_CLOUDINARY_FOLDER: z.string().default("pointer/time-records"),
  POINTER_MAPBOX_ACCESS_TOKEN: z.string().optional(),
  POINTER_WEB_PUSH_SUBJECT: z.string().default("mailto:no-reply@pointer.local"),
  POINTER_WEB_PUSH_PUBLIC_KEY: z.string().optional(),
  POINTER_WEB_PUSH_PRIVATE_KEY: z.string().optional(),
  POINTER_GEOCODING_PROVIDER: z.enum(["none", "nominatim"]).default("nominatim"),
  POINTER_GEOCODING_USER_AGENT: z.string().default("Pointer/0.1 (isolated-mvp)"),
  POINTER_EMAIL_FROM: z.string().default("Pointer <no-reply@pointer.local>"),
  POINTER_SMTP_HOST: z.string().optional(),
  POINTER_SMTP_PORT: z.number().int().positive().default(587),
  POINTER_SMTP_SECURE: z.boolean().default(false),
  POINTER_SMTP_USER: z.string().optional(),
  POINTER_SMTP_PASSWORD: z.string().optional(),
  POINTER_CRON_SECRET: z.string().min(16).default("pointer-cron-secret-exclusivo"),
  CRON_SECRET: z.string().optional(),
  POINTER_STRIPE_SECRET_KEY: z.string().optional(),
  POINTER_STRIPE_WEBHOOK_SECRET: z.string().optional(),
  POINTER_STRIPE_PORTAL_CONFIG_ID: z.string().optional(),
  POINTER_STRIPE_PRICE_STARTER: z.string().optional(),
  POINTER_STRIPE_PRICE_PRO: z.string().optional(),
  POINTER_STRIPE_PRICE_ENTERPRISE: z.string().optional(),
  POINTER_BILLING_GRACE_DAYS: z.number().int().min(0).default(5),
});

export const env = envSchema.parse({
  DATABASE_URL: emptyToUndefined(process.env.DATABASE_URL),
  POINTER_APP_URL: normalizeAppUrl(process.env.POINTER_APP_URL),
  POINTER_ROOT_DOMAIN: normalizeRootDomain(process.env.POINTER_ROOT_DOMAIN),
  POINTER_SESSION_SECRET: normalizeSessionSecret(process.env.POINTER_SESSION_SECRET),
  POINTER_STORAGE_DRIVER: normalizeStorageDriver(process.env.POINTER_STORAGE_DRIVER),
  POINTER_STORAGE_LOCAL_DIR: emptyToUndefined(process.env.POINTER_STORAGE_LOCAL_DIR),
  POINTER_SUPABASE_URL: emptyToUndefined(process.env.POINTER_SUPABASE_URL),
  POINTER_SUPABASE_SERVICE_ROLE_KEY: emptyToUndefined(process.env.POINTER_SUPABASE_SERVICE_ROLE_KEY),
  POINTER_SUPABASE_BUCKET: emptyToUndefined(process.env.POINTER_SUPABASE_BUCKET),
  POINTER_CLOUDINARY_CLOUD_NAME: emptyToUndefined(process.env.POINTER_CLOUDINARY_CLOUD_NAME),
  POINTER_CLOUDINARY_API_KEY: emptyToUndefined(process.env.POINTER_CLOUDINARY_API_KEY),
  POINTER_CLOUDINARY_API_SECRET: emptyToUndefined(process.env.POINTER_CLOUDINARY_API_SECRET),
  POINTER_CLOUDINARY_FOLDER: emptyToUndefined(process.env.POINTER_CLOUDINARY_FOLDER),
  POINTER_MAPBOX_ACCESS_TOKEN: emptyToUndefined(process.env.POINTER_MAPBOX_ACCESS_TOKEN),
  POINTER_WEB_PUSH_SUBJECT: emptyToUndefined(process.env.POINTER_WEB_PUSH_SUBJECT),
  POINTER_WEB_PUSH_PUBLIC_KEY: emptyToUndefined(process.env.POINTER_WEB_PUSH_PUBLIC_KEY),
  POINTER_WEB_PUSH_PRIVATE_KEY: emptyToUndefined(process.env.POINTER_WEB_PUSH_PRIVATE_KEY),
  POINTER_GEOCODING_PROVIDER: normalizeGeocodingProvider(process.env.POINTER_GEOCODING_PROVIDER),
  POINTER_GEOCODING_USER_AGENT: emptyToUndefined(process.env.POINTER_GEOCODING_USER_AGENT),
  POINTER_EMAIL_FROM: emptyToUndefined(process.env.POINTER_EMAIL_FROM),
  POINTER_SMTP_HOST: emptyToUndefined(process.env.POINTER_SMTP_HOST),
  POINTER_SMTP_PORT: normalizePositiveInt(process.env.POINTER_SMTP_PORT, 587),
  POINTER_SMTP_SECURE: normalizeSmtpSecure(process.env.POINTER_SMTP_SECURE),
  POINTER_SMTP_USER: emptyToUndefined(process.env.POINTER_SMTP_USER),
  POINTER_SMTP_PASSWORD: emptyToUndefined(process.env.POINTER_SMTP_PASSWORD),
  POINTER_CRON_SECRET: emptyToUndefined(process.env.POINTER_CRON_SECRET),
  CRON_SECRET: emptyToUndefined(process.env.CRON_SECRET),
  POINTER_STRIPE_SECRET_KEY: emptyToUndefined(process.env.POINTER_STRIPE_SECRET_KEY),
  POINTER_STRIPE_WEBHOOK_SECRET: emptyToUndefined(process.env.POINTER_STRIPE_WEBHOOK_SECRET),
  POINTER_STRIPE_PORTAL_CONFIG_ID: emptyToUndefined(process.env.POINTER_STRIPE_PORTAL_CONFIG_ID),
  POINTER_STRIPE_PRICE_STARTER: emptyToUndefined(process.env.POINTER_STRIPE_PRICE_STARTER),
  POINTER_STRIPE_PRICE_PRO: emptyToUndefined(process.env.POINTER_STRIPE_PRICE_PRO),
  POINTER_STRIPE_PRICE_ENTERPRISE: emptyToUndefined(process.env.POINTER_STRIPE_PRICE_ENTERPRISE),
  POINTER_BILLING_GRACE_DAYS: normalizeNonNegativeInt(process.env.POINTER_BILLING_GRACE_DAYS, 5),
});
