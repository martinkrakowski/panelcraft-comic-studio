/**
 * Provider-agnostic session + cookie helpers for the OAuth login flow.
 *
 * The session is stored in a single httpOnly cookie so the access token never
 * reaches client-side JavaScript. The payload is base64url-encoded JSON (not
 * signed) — adequate for this demo since httpOnly already blocks JS access; a
 * production deployment should sign or encrypt it (e.g. JWT with `JWT_SECRET`).
 */

export const SESSION_COOKIE = 'auth_session';
export const STATE_COOKIE = 'auth_oauth_state';

/** Display-oriented identity, independent of which IdP produced it. */
export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  /** True when this identity came from the offline mock login, not a real IdP. */
  demo: boolean;
  /** Human label of the source, e.g. "Adobe", "Google", or "Demo". */
  provider: string;
}

/** A token after the provider has normalized its expiry to milliseconds. */
export interface NormalizedToken {
  accessToken: string;
  expiresInMs?: number;
}

interface AuthSession {
  user: AuthUser;
  accessToken?: string;
  /** Absolute expiry (epoch ms) of the access token, when known. */
  expiresAt?: number;
}

/** Encode a session into the opaque value stored in the httpOnly cookie. */
export function createSession(
  user: AuthUser,
  token: NormalizedToken | null
): string {
  const session: AuthSession = {
    user,
    accessToken: token?.accessToken,
    expiresAt:
      typeof token?.expiresInMs === 'number'
        ? Date.now() + token.expiresInMs
        : undefined,
  };
  return Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
}

/** Decode and validate a session cookie value. Returns null when unusable. */
export function readSession(raw: string | undefined): AuthSession | null {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'user' in parsed &&
      (parsed as AuthSession).user?.id
    ) {
      return parsed as AuthSession;
    }
    return null;
  } catch {
    return null;
  }
}

/** True when the session's access token has a known, elapsed expiry. */
export function isSessionExpired(session: AuthSession): boolean {
  return (
    typeof session.expiresAt === 'number' && session.expiresAt < Date.now()
  );
}

const ONE_DAY_SECONDS = 60 * 60 * 24;

/**
 * Cookie flags for the session/state cookies.
 *
 * In production we need `SameSite=None; Secure` so the cookie survives if the
 * web and API are served from different domains. In local dev the two origins
 * differ only by port (same site: `localhost`), so `Lax` works without HTTPS.
 */
export function sessionCookieOptions(expiresInMs?: number) {
  const isProd = process.env.NODE_ENV === 'production';
  const maxAge =
    typeof expiresInMs === 'number'
      ? Math.min(Math.max(Math.floor(expiresInMs / 1000), 60), ONE_DAY_SECONDS)
      : ONE_DAY_SECONDS;
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    maxAge,
  };
}

/** Short-lived flags for the one-time CSRF state cookie (10 minutes). */
export function stateCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    maxAge: 60 * 10,
  };
}
