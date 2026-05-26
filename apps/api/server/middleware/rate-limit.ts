import { randomUUID } from 'node:crypto';
import {
  defineEventHandler,
  getCookie,
  setCookie,
  setResponseStatus,
} from 'h3';
import { createLogger } from '@panelcraft/shared';
import { getClientIp } from '../utils/client-ip.js';
import { checkRateLimit } from '../utils/rate-limiter.js';

const logger = createLogger('RateLimit');

const TEXT_LIMIT = 40; // RPM per session — reasoning + non-reasoning combined
const IMAGE_LIMIT = 12; // RPM per session — grok-imagine-image
const WARN_AT = 0.8; // log a warning when a session hits 80% of its limit

const SESSION_COOKIE = 'sessionId';
const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours

// Routes that trigger text LLM calls
const TEXT_ROUTES = new Set([
  '/api/wizard/analyze-prompt',
  '/api/wizard/extract-characters',
]);

// Routes that trigger image generation calls
const IMAGE_ROUTES = new Set(['/api/wizard/preview-style']);

type CallType = 'text' | 'image';

/**
 * Determines the call type for rate limiting based on route and HTTP method.
 * @param path - Request path (e.g., '/api/wizard/analyze-prompt')
 * @param method - HTTP method (e.g., 'POST')
 * @returns 'text' for LLM calls, 'image' for image generation, or null if route is not rate-limited
 * @example resolveCallType('/api/wizard/analyze-prompt', 'POST') → 'text'
 */
function resolveCallType(path: string, method: string): CallType | null {
  if (TEXT_ROUTES.has(path)) return 'text';
  if (IMAGE_ROUTES.has(path)) return 'image';
  // POST /api/projects queues the full generation pipeline — image calls dominate cost
  if (path === '/api/projects' && method === 'POST') return 'image';
  return null;
}

/**
 * Rate limiting middleware that enforces per-session request limits for LLM and image generation routes.
 * Uses session cookies when available, falls back to client IP for non-cookie clients (curl, server-to-server).
 * Returns 429 when limits are exceeded; logs warnings at 80% threshold.
 * @throws Error if rate limit check fails or cookie operations error
 */
export default defineEventHandler((event) => {
  const path = event.path ?? '';
  const method = (event.method ?? 'GET').toUpperCase();
  const debug = process.env['PANELCRAFT_DEBUG'] === 'true';

  // Only apply rate limiting to LLM / image-generating routes
  const callType = resolveCallType(path, method);
  if (!callType) return;

  // Resolve or mint a session ID. We only mint on rate-limited routes to avoid
  // UUID generation overhead on every health-check / static request.
  // Falls back to IP when cookies are unavailable (curl, server-to-server).
  let sessionId = getCookie(event, SESSION_COOKIE);
  let _usesIpFallback = false;
  if (!sessionId) {
    const clientIp = getClientIp(event);
    // Use IP as fallback to prevent non-cookie clients from evading rate limits
    sessionId = clientIp;
    _usesIpFallback = true;
    // Attempt to mint and set a cookie for future requests
    const newSessionId = randomUUID();
    try {
      setCookie(event, SESSION_COOKIE, newSessionId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env['NODE_ENV'] === 'production',
        maxAge: SESSION_MAX_AGE,
        path: '/',
      });
      if (debug) {
        logger.debug('New session minted', {
          sessionId: newSessionId,
          ip: clientIp,
        });
      }
    } catch (err) {
      if (debug) {
        logger.debug('Failed to set session cookie, using IP fallback', {
          error: err instanceof Error ? err.message : String(err),
          ip: clientIp,
        });
      }
    }
  }

  const limit = callType === 'text' ? TEXT_LIMIT : IMAGE_LIMIT;
  const key = `${callType}:${sessionId}`;

  const { allowed, count, retryAfter } = checkRateLimit(key, limit);
  const pct = Math.round((count / limit) * 100);

  if (debug) {
    logger.debug('Rate limit check', {
      method,
      path,
      sessionId,
      callType,
      count,
      limit,
      pct,
    });
  }

  if (!allowed) {
    logger.warn('Rate limit exceeded — 429', {
      method,
      path,
      sessionId,
      callType,
      limit,
    });
    setResponseStatus(event, 429);
    return {
      error: 'Rate limit exceeded',
      message:
        callType === 'image'
          ? `Image generation is limited to ${IMAGE_LIMIT} requests per minute. Retry in ${retryAfter}s.`
          : `Text analysis is limited to ${TEXT_LIMIT} requests per minute. Retry in ${retryAfter}s.`,
      retryAfter,
      type: callType,
    };
  }

  // Warn when a session is approaching its limit, even outside debug mode
  if (count >= Math.floor(limit * WARN_AT)) {
    logger.warn('Rate limit approaching threshold', {
      sessionId,
      callType,
      count,
      limit,
      pct,
    });
  }
});
