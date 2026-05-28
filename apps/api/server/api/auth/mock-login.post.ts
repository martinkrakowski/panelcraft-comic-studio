import { createError, defineEventHandler, setCookie } from 'h3';
import { randomUUID } from 'node:crypto';
import { ok } from '../../utils/envelope.js';
import { getActiveProvider } from '../../utils/auth-providers.js';
import {
  createSession,
  sessionCookieOptions,
  SESSION_COOKIE,
  type AuthUser,
} from '../../utils/auth-session.js';

/**
 * POST /api/auth/mock-login
 *
 * Demo fallback that establishes a deterministic identity without contacting an
 * IdP. Only available in Demo Mode — when a real provider is configured this is
 * disabled (403) so it can't be used to bypass OAuth.
 */
export default defineEventHandler((event) => {
  if (getActiveProvider().isConfigured) {
    throw createError({
      statusCode: 403,
      statusMessage:
        'Demo login is disabled when an identity provider is configured.',
      data: { code: 'DEMO_DISABLED' },
    });
  }

  // Unique id per demo login so each demo visitor gets an isolated workspace
  // (ownership is derived from this id). The id persists in their cookie, so a
  // given browser keeps its demo projects across reloads.
  const user: AuthUser = {
    id: `demo-${randomUUID()}`,
    name: 'Demo Creator',
    email: 'demo@panelcraft.studio',
    demo: true,
    provider: 'Demo',
  };

  setCookie(
    event,
    SESSION_COOKIE,
    createSession(user, null),
    sessionCookieOptions()
  );
  return ok({ user, demoMode: true, provider: 'demo', label: 'Demo' });
});
