import {
  defineEventHandler,
  getQuery,
  getRouterParam,
  setResponseHeader,
  setResponseStatus,
  type H3Event,
} from 'h3';
import { createLogger } from '@panelcraft/shared';
import { getStorage } from '../../utils/storage.js';
import { getMediaUrls, isMediaKeyAllowed } from '../../utils/media-urls.js';

const logger = createLogger('media');

function respond(event: H3Event, status: number, body: unknown) {
  setResponseStatus(event, status);
  return body;
}

/**
 * GET /api/media/<key>?exp=<unix seconds>&sig=<base64url HMAC-SHA256>
 *
 * Serves objects from storage directly through the API (OCI Object Storage has
 * no bucket CORS and must not be exposed). The signature in the query string is
 * the authorisation — no auth cookie is required. Bad/missing signatures,
 * expired links, and missing objects all return generic 403/404 responses so
 * nothing about the failure reason leaks.
 */
export default defineEventHandler(async (event) => {
  const rawKey = getRouterParam(event, 'key');

  let key: string;
  if (typeof rawKey !== 'string' || rawKey.length === 0) {
    return respond(event, 400, { error: 'Invalid media key' });
  }
  try {
    key = rawKey
      .split('/')
      .map((segment) => decodeURIComponent(segment))
      .join('/');
  } catch {
    return respond(event, 400, { error: 'Invalid media key' });
  }

  if (!isMediaKeyAllowed(key)) {
    return respond(event, 400, { error: 'Invalid media key' });
  }

  const query = getQuery(event);
  const exp = query.exp;
  const sig = query.sig;
  if (typeof exp !== 'string' || typeof sig !== 'string') {
    return respond(event, 403, { error: 'Forbidden' });
  }

  const result = getMediaUrls().verify(key, exp, sig);
  if (result === 'bad-key') {
    return respond(event, 400, { error: 'Invalid media key' });
  }
  if (result !== 'ok') {
    // expired or bad-signature: same body, never say which
    return respond(event, 403, { error: 'Forbidden' });
  }

  let stored;
  try {
    stored = await getStorage().get(key);
  } catch (err) {
    logger.error(
      `Storage error for ${key}: ${err instanceof Error ? err.message : String(err)}`
    );
    return respond(event, 502, { error: 'Storage error' });
  }

  if (!stored) {
    return respond(event, 404, { error: 'Not found' });
  }

  if (stored.contentType.startsWith('image/')) {
    setResponseHeader(event, 'Content-Type', stored.contentType);
  } else {
    setResponseHeader(event, 'Content-Type', 'application/octet-stream');
    setResponseHeader(event, 'Content-Disposition', 'attachment');
  }
  setResponseHeader(event, 'Content-Length', stored.contentLength);
  const maxAge = Math.min(
    Number(exp) - Math.floor(Date.now() / 1000),
    3600
  );
  setResponseHeader(
    event,
    'Cache-Control',
    `private, max-age=${Math.max(0, maxAge)}`
  );
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff');

  return stored.body;
});
