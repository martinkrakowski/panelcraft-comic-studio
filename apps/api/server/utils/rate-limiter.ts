const WINDOW_MS = 60_000; // 1 minute sliding window

interface Bucket {
  count: number;
  resetTime: number;
}

const store = new Map<string, Bucket>();

/**
 * Fixed-window rate limit check keyed on an arbitrary string (e.g. "text:<sessionId>").
 * Returns count so callers can log proximity to the threshold.
 */
export function checkRateLimit(
  key: string,
  limit: number
): { allowed: boolean; count: number; retryAfter?: number } {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || now >= bucket.resetTime) {
    store.set(key, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true, count: 1 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      count: bucket.count,
      retryAfter: Math.ceil((bucket.resetTime - now) / 1000),
    };
  }

  bucket.count++;
  return { allowed: true, count: bucket.count };
}

// Purge expired entries every 5 minutes to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of store.entries()) {
    if (now >= bucket.resetTime) store.delete(key);
  }
}, 5 * 60_000);
