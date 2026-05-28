import { defineEventHandler, getHeader, setResponseStatus } from 'h3';
import { useRuntimeConfig } from 'nitropack/runtime';
import { fail } from '../utils/envelope.js';

/**
 * CSRF protection for state-changing requests.
 *
 * Session auth is cookie-based, and in production the session cookie is
 * `SameSite=None` (so it works when web + API are on different origins) — which
 * means the browser will attach it to cross-site requests. To stop a malicious
 * site from driving authenticated mutations, every POST/PUT/PATCH/DELETE must
 * carry an `Origin` (or `Referer`) that matches our allowlist.
 *
 * - Origin present + not allowlisted -> 403 (a cross-site browser request).
 * - Origin absent -> fall back to Referer; if that's present it must match.
 * - Neither present -> allowed in dev/test (non-browser clients like curl and
 *   the test harness aren't CSRF vectors, and SameSite=Lax already blocks
 *   cross-site cookies there), but rejected in production where the cookie is
 *   cross-site-capable.
 *
 * Browsers always send `Origin` on cross-origin (and on same-origin non-GET)
 * requests, so this blocks real CSRF without breaking same-origin use.
 */
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function allowedOrigins(): Set<string> {
  const { cors, auth } = useRuntimeConfig();
  const origins = Array.isArray(cors?.origin)
    ? cors.origin
    : cors?.origin
      ? [cors.origin]
      : [];
  const set = new Set<string>(origins.map(String));
  if (auth?.appBaseUrl) set.add(String(auth.appBaseUrl));
  return set;
}

function originFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function reject(
  event: Parameters<typeof setResponseStatus>[0],
  detail: string
) {
  setResponseStatus(event, 403);
  return fail('CSRF_BLOCKED', detail);
}

export default defineEventHandler((event) => {
  const method = (event.method ?? 'GET').toUpperCase();
  if (!MUTATING_METHODS.has(method)) return;

  const allowed = allowedOrigins();
  const origin = getHeader(event, 'origin');
  if (origin) {
    if (!allowed.has(origin)) {
      return reject(event, 'Cross-site request blocked (origin not allowed).');
    }
    return;
  }

  const refererOrigin = originFromUrl(getHeader(event, 'referer'));
  if (refererOrigin) {
    if (!allowed.has(refererOrigin)) {
      return reject(event, 'Cross-site request blocked (referer not allowed).');
    }
    return;
  }

  // No Origin and no Referer: a non-browser client. Block in production where
  // the session cookie is cross-site-capable; allow elsewhere.
  if (process.env.NODE_ENV === 'production') {
    return reject(event, 'Missing Origin on state-changing request.');
  }
});
