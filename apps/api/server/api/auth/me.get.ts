import { defineEventHandler, getCookie, deleteCookie } from 'h3';
import { ok } from '../../utils/envelope.js';
import { getActiveProvider } from '../../utils/auth-providers.js';
import {
  readSession,
  isSessionExpired,
  sessionCookieOptions,
  SESSION_COOKIE,
} from '../../utils/auth-session.js';

/**
 * GET /api/auth/me
 *
 * Hydration endpoint. Returns the current user (or null) plus `demoMode` and
 * the active provider label so the client can render the right sign-in button.
 * Expired sessions are cleared and reported as logged out.
 */
export default defineEventHandler((event) => {
  const provider = getActiveProvider();
  const demoMode = !provider.isConfigured;
  const base = { demoMode, provider: provider.id, label: provider.label };

  const session = readSession(getCookie(event, SESSION_COOKIE));

  if (!session) {
    return ok({ user: null, ...base });
  }

  if (isSessionExpired(session)) {
    deleteCookie(event, SESSION_COOKIE, sessionCookieOptions());
    return ok({ user: null, ...base });
  }

  return ok({ user: session.user, ...base });
});
