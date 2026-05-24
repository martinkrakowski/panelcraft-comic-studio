/**
 * Simple in-memory rate limiter for API endpoints
 * Limits to 10 requests per minute per IP
 */

const RATE_LIMIT = 10; // requests per window
const WINDOW_MS = 60 * 1000; // 1 minute

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Check if a request from the given IP exceeds the rate limit
 * @param ip - Client IP address
 * @returns { allowed: boolean, retryAfter?: number }
 */
export function checkRateLimit(ip: string): {
  allowed: boolean;
  retryAfter?: number;
} {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetTime) {
    // New window or window expired
    store.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  // Increment count
  entry.count++;
  store.set(ip, entry);
  return { allowed: true };
}

// Cleanup expired entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [ip, entry] of store.entries()) {
      if (now > entry.resetTime) {
        store.delete(ip);
      }
    }
  },
  5 * 60 * 1000
);
