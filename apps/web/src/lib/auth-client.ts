import type { ResponseEnvelope } from '@panelcraft/types';

/**
 * Client-side bindings for the provider-agnostic OAuth routes on the Nitro API
 * (`/api/auth/*`). The active IdP (Adobe / Google) is chosen server-side; the
 * client just renders the label the server reports.
 *
 * Every call sends `credentials: 'include'` so the httpOnly session cookie
 * (set cross-origin by the API on `localhost:3001`) is sent and stored. The
 * access token itself never reaches this layer — it lives only in the cookie.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** Display-oriented profile, mirrored from the API's `AuthUser`. */
export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  demo: boolean;
  /** Source label, e.g. "Adobe", "Google", or "Demo". */
  provider: string;
}

export interface AuthSessionResult {
  user: AuthUser | null;
  demoMode: boolean;
  /** Active provider id, e.g. "adobe" | "google". */
  provider: string;
  /** Active provider label for the sign-in button, e.g. "Adobe" | "Google". */
  label: string;
}

/** Top-level navigation target that begins the OAuth redirect dance. */
export const authLoginUrl = `${API_BASE}/api/auth/login`;

/**
 * sessionStorage key used to carry the post-login destination across the
 * cross-origin OAuth hop (login screen -> provider -> /auth/callback).
 */
export const POST_LOGIN_RETURN_KEY = 'postLoginReturnTo';

async function authRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  let envelope: ResponseEnvelope<T> | null = null;
  try {
    envelope = (await response.json()) as ResponseEnvelope<T>;
  } catch {
    // fall through to status-based error below
  }

  if (!response.ok || !envelope?.success) {
    throw new Error(
      envelope?.error?.message || `Request failed (status ${response.status})`
    );
  }

  return envelope.data as T;
}

/** Read the current session for hydration. Never throws on logged-out. */
export async function getAuthSession(): Promise<AuthSessionResult> {
  return authRequest<AuthSessionResult>('/api/auth/me');
}

/** Complete the real OAuth flow by exchanging the returned code. */
export async function exchangeAuthCode(
  code: string,
  state: string
): Promise<AuthUser> {
  const data = await authRequest<{ user: AuthUser }>('/api/auth/callback', {
    method: 'POST',
    body: JSON.stringify({ code, state }),
  });
  return data.user;
}

/** Establish the offline demo identity (no IdP round-trip). */
export async function authMockLogin(): Promise<AuthUser> {
  const data = await authRequest<{ user: AuthUser }>('/api/auth/mock-login', {
    method: 'POST',
  });
  return data.user;
}

/** Clear the session cookie. */
export async function authLogout(): Promise<void> {
  await authRequest<{ success: boolean }>('/api/auth/logout', {
    method: 'POST',
  });
}
