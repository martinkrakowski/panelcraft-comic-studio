import { defineEventHandler, setCookie } from 'h3';
import { ok } from '../../utils/envelope.js';
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
 * IdP. Available even when a provider is configured, so the demo can proceed if
 * the network or credentials are unavailable on the day.
 */
export default defineEventHandler((event) => {
  const user: AuthUser = {
    id: 'demo-user',
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
