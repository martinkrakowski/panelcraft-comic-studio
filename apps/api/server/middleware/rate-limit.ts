import { randomUUID } from 'node:crypto';
import {
  defineEventHandler,
  getCookie,
  setCookie,
  setResponseStatus,
} from 'h3';
import { getClientIp } from '../utils/client-ip.js';
import { checkRateLimit } from '../utils/rate-limiter.js';

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

function resolveCallType(path: string, method: string): CallType | null {
  if (TEXT_ROUTES.has(path)) return 'text';
  if (IMAGE_ROUTES.has(path)) return 'image';
  // POST /api/projects queues the full generation pipeline — image calls dominate cost
  if (path === '/api/projects' && method === 'POST') return 'image';
  return null;
}

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
  if (!sessionId) {
    sessionId = randomUUID();
    setCookie(event, SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env['NODE_ENV'] === 'production',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });
    if (debug) {
      console.warn(
        `[RateLimit] New session minted: ${sessionId} (ip=${getClientIp(event)})`
      );
    }
  }

  const limit = callType === 'text' ? TEXT_LIMIT : IMAGE_LIMIT;
  const key = `${callType}:${sessionId}`;

  const { allowed, count, retryAfter } = checkRateLimit(key, limit);
  const pct = Math.round((count / limit) * 100);

  if (debug) {
    console.warn(
      `[RateLimit] ${method} ${path} | session=${sessionId} | ${callType} ${count}/${limit} (${pct}%)`
    );
  }

  if (!allowed) {
    console.warn(
      `[RateLimit] 429 | ${method} ${path} | session=${sessionId} | ${callType} limit ${limit} RPM`
    );
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
    console.warn(
      `[RateLimit] Approaching limit | session=${sessionId} | ${callType} ${count}/${limit} (${pct}%)`
    );
  }
});
