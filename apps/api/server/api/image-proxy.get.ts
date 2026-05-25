import {
  defineEventHandler,
  getQuery,
  setResponseStatus,
  setResponseHeader,
} from 'h3';
import { createLogger } from '@panelcraft/shared';

const logger = createLogger('image-proxy');

// Server-side allowlist for the proxy. Open proxies are an SSRF foot-gun;
// scope to the hosts we actually need to bridge for `html-to-image` exports.
// Extend cautiously when adding a new image source.
const ALLOWED_HOST_SUFFIXES = ['x.ai', 'supabase.co', 'amazonaws.com'];
const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 25 * 1024 * 1024; // 25 MB, well above any panel size
const MAX_REDIRECTS = 3;

function isAllowedHost(hostname: string): boolean {
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`)
  );
}

/**
 * Hostname-only stringification for logs. Signed Supabase URLs carry a
 * `token` query parameter that grants storage access; never log the full
 * URL.
 */
function redact(u: URL): string {
  return `${u.protocol}//${u.hostname}${u.pathname}`;
}

/**
 * GET /api/image-proxy?url=<absolute-https-url>
 *
 * Re-serves a remote image with permissive CORS headers so the client-side
 * canvas / html-to-image exporter can read its pixels. The remote host
 * (e.g., xAI's image CDN) doesn't send CORS, which leaves the panel images
 * un-exportable from the browser.
 *
 * Scope: short-lived images we already reference in our own DB. The URL
 * query parameter is validated against {@link ALLOWED_HOST_SUFFIXES} to
 * prevent the endpoint from becoming a generic SSRF gadget.
 */
export default defineEventHandler(async (event) => {
  const { url } = getQuery(event) as { url?: string };
  if (typeof url !== 'string' || !url) {
    setResponseStatus(event, 400);
    return { error: 'Missing url query parameter' };
  }

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    setResponseStatus(event, 400);
    return { error: 'Invalid url query parameter' };
  }

  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    setResponseStatus(event, 400);
    return { error: 'Only http(s) URLs are allowed' };
  }

  if (!isAllowedHost(target.hostname)) {
    setResponseStatus(event, 403);
    return { error: `Host ${target.hostname} is not on the proxy allowlist` };
  }

  // Manual redirect handling so we can re-validate the destination host
  // against the allowlist on each hop — `fetch`'s default redirect-follow
  // mode would happily chase an allowlisted URL into a private/internal
  // host (SSRF). Timeout via AbortController prevents a slow upstream from
  // hanging the route, and we stream the body to enforce a hard byte cap
  // rather than buffering an unbounded arrayBuffer.
  let current = target;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let upstream: Response | undefined;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(current.toString(), {
        redirect: 'manual',
        signal: controller.signal,
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) {
          setResponseStatus(event, 502);
          return { error: 'Upstream redirect missing Location header' };
        }
        const next = new URL(location, current);
        if (next.protocol !== 'https:' && next.protocol !== 'http:') {
          setResponseStatus(event, 400);
          return { error: 'Upstream redirect to unsupported protocol' };
        }
        if (!isAllowedHost(next.hostname)) {
          logger.warn(
            `Refused redirect to non-allowlisted host ${next.hostname}`
          );
          setResponseStatus(event, 403);
          return { error: 'Upstream redirect blocked by allowlist' };
        }
        current = next;
        continue;
      }

      upstream = res;
      break;
    }

    if (!upstream) {
      setResponseStatus(event, 508);
      return { error: 'Too many redirects' };
    }

    if (!upstream.ok) {
      setResponseStatus(event, upstream.status);
      return { error: `Upstream returned ${upstream.status}` };
    }

    const contentType =
      upstream.headers.get('content-type') || 'application/octet-stream';
    if (!contentType.startsWith('image/')) {
      setResponseStatus(event, 415);
      return { error: 'Upstream did not return an image' };
    }

    const declaredLength = upstream.headers.get('content-length');
    if (declaredLength && Number(declaredLength) > MAX_RESPONSE_BYTES) {
      setResponseStatus(event, 413);
      return { error: 'Upstream response exceeds proxy size limit' };
    }

    // Stream the body so we can short-circuit oversize responses without
    // ever buffering them into memory.
    if (!upstream.body) {
      setResponseStatus(event, 502);
      return { error: 'Upstream response had no body' };
    }
    const reader = upstream.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_RESPONSE_BYTES) {
        controller.abort();
        setResponseStatus(event, 413);
        return { error: 'Upstream response exceeds proxy size limit' };
      }
      chunks.push(value);
    }
    const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));

    setResponseHeader(event, 'Content-Type', contentType);
    // Permit any origin for proxied images — the response is already a
    // public asset (we just refetched it) and the consumer is our own
    // browser code. Cache briefly so retries on the export button don't
    // hammer the upstream.
    setResponseHeader(event, 'Access-Control-Allow-Origin', '*');
    setResponseHeader(event, 'Cache-Control', 'public, max-age=300');
    return buffer;
  } catch (err) {
    logger.error(
      `Proxy fetch failed for ${redact(current)}: ${err instanceof Error ? err.message : String(err)}`
    );
    setResponseStatus(event, 502);
    return { error: 'Failed to fetch upstream image' };
  } finally {
    clearTimeout(timeout);
  }
});
