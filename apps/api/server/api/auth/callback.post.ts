import {
  defineEventHandler,
  readBody,
  getCookie,
  setCookie,
  deleteCookie,
  setResponseStatus,
} from 'h3';
import { createLogger } from '@panelcraft/shared';
import { ok, fail } from '../../utils/envelope.js';
import { getActiveProvider } from '../../utils/auth-providers.js';
import {
  createSession,
  sessionCookieOptions,
  stateCookieOptions,
  SESSION_COOKIE,
  STATE_COOKIE,
} from '../../utils/auth-session.js';

const logger = createLogger('auth.callback');

/**
 * POST /api/auth/callback
 *
 * Completes the authorization-code flow: validates the CSRF `state`, exchanges
 * the code for an access token, fetches the user's profile, and persists the
 * session in an httpOnly cookie.
 *
 * Body: `{ code: string; state: string }`
 */
export default defineEventHandler(async (event) => {
  const provider = getActiveProvider();

  if (!provider.isConfigured) {
    setResponseStatus(event, 400);
    return fail(
      'PROVIDER_NOT_CONFIGURED',
      `${provider.label} sign-in is not configured on this server. Use demo mode instead.`
    );
  }

  const body = await readBody<{ code?: string; state?: string }>(event);
  const code = body?.code?.trim();
  const state = body?.state?.trim();

  if (!code || !state) {
    setResponseStatus(event, 400);
    return fail('VALIDATION_ERROR', 'Missing authorization code or state.');
  }

  // The state cookie is single-use — clear it regardless of the outcome.
  const expectedState = getCookie(event, STATE_COOKIE);
  deleteCookie(event, STATE_COOKIE, stateCookieOptions());

  if (!expectedState || expectedState !== state) {
    setResponseStatus(event, 400);
    return fail(
      'STATE_MISMATCH',
      'Sign-in could not be verified (state mismatch). Please try again.'
    );
  }

  try {
    const token = await provider.exchangeCode(code);
    const user = await provider.fetchUserInfo(token);

    setCookie(
      event,
      SESSION_COOKIE,
      createSession(user, token),
      sessionCookieOptions(token.expiresInMs)
    );

    return ok({
      user,
      demoMode: false,
      provider: provider.id,
      label: provider.label,
    });
  } catch (err) {
    logger.error(
      `${provider.label} token exchange / userinfo failed`,
      err instanceof Error ? err : new Error(String(err))
    );
    setResponseStatus(event, 502);
    return fail(
      'OAUTH_EXCHANGE_FAILED',
      `Could not complete ${provider.label} sign-in. Please try again.`
    );
  }
});
