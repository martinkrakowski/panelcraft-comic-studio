import { defineEventHandler, setCookie, sendRedirect } from 'h3';
import { randomUUID } from 'node:crypto';
import { getActiveProvider } from '../../utils/auth-providers.js';
import { stateCookieOptions, STATE_COOKIE } from '../../utils/auth-session.js';

/**
 * GET /api/auth/login
 *
 * Top-level navigation entry point for the OAuth flow. Mints a one-time CSRF
 * `state`, stores it in a short-lived httpOnly cookie, and 302-redirects the
 * browser to the active provider's authorize screen.
 *
 * When the provider is not configured we bounce to the frontend callback with
 * `?mock=1` so the same client-side flow completes in Demo Mode.
 */
export default defineEventHandler((event) => {
  const provider = getActiveProvider();

  if (!provider.isConfigured) {
    return sendRedirect(
      event,
      `${provider.appBaseUrl}/auth/callback?mock=1`,
      302
    );
  }

  const state = randomUUID();
  setCookie(event, STATE_COOKIE, state, stateCookieOptions());
  return sendRedirect(event, provider.buildAuthorizeUrl(state), 302);
});
