const buckets = new Map<string, { count: number; resetAt: number }>();

export function assertRateLimit(key: string, max = 10, windowMs = 60_000) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (current.count >= max) {
    throw new Error("Muitas tentativas. Aguarde alguns instantes e tente novamente.");
  }

  current.count += 1;
}
