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

function isAllowedHost(hostname: string): boolean {
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`)
  );
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

  try {
    const upstream = await fetch(target.toString());
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

    const buffer = Buffer.from(await upstream.arrayBuffer());

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
      `Proxy fetch failed for ${target.toString()}: ${err instanceof Error ? err.message : String(err)}`
    );
    setResponseStatus(event, 502);
    return { error: 'Failed to fetch upstream image' };
  }
});
