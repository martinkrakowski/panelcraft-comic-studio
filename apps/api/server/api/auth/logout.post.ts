import { defineEventHandler, deleteCookie } from 'h3';
import { ok } from '../../utils/envelope.js';
import {
  sessionCookieOptions,
  SESSION_COOKIE,
} from '../../utils/auth-session.js';

/**
 * POST /api/auth/logout
 *
 * Clears the session cookie. Idempotent — always returns success.
 */
export default defineEventHandler((event) => {
  deleteCookie(event, SESSION_COOKIE, sessionCookieOptions());
  return ok({ success: true });
});
