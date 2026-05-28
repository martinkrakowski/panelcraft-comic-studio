import type { AuthUser, NormalizedToken } from './auth-session.js';

/**
 * OAuth identity providers behind the login flow. Both Adobe IMS and Google
 * are OpenID Connect, so they share one shape: authorize -> exchange code ->
 * fetch userinfo. The active provider is chosen by the `AUTH_PROVIDER` env.
 *
 * Adobe stays wired for the Firefly team's entitled org; Google is the
 * provider used to prove the flow end-to-end during the demo (it grants the
 * same OIDC profile scopes and permits http://localhost redirect URIs).
 */
export interface AuthProvider {
  id: 'adobe' | 'google';
  /** Human label used in the UI ("Adobe", "Google"). */
  label: string;
  /** True only when both halves of the OAuth credential are present. */
  isConfigured: boolean;
  /** Frontend base URL the user returns to after login. */
  appBaseUrl: string;
  buildAuthorizeUrl(state: string): string;
  exchangeCode(code: string): Promise<NormalizedToken>;
  fetchUserInfo(token: NormalizedToken): Promise<AuthUser>;
}

interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
  imsOrigin: string;
}

interface AuthRuntimeConfig {
  provider: string;
  appBaseUrl: string;
  adobe: ProviderConfig;
  google: ProviderConfig;
}

function normalizeScopes(scopes: string, separator: string): string {
  return scopes
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(separator);
}

/** Read a string field from a userinfo payload, or undefined if absent. */
function field(data: Record<string, unknown>, key: string): string | undefined {
  return typeof data[key] === 'string' ? (data[key] as string) : undefined;
}

/** Adobe IMS (OIDC). `expires_in` is in milliseconds. */
function adobeProvider(cfg: ProviderConfig, appBaseUrl: string): AuthProvider {
  const label = 'Adobe';
  return {
    id: 'adobe',
    label,
    isConfigured: Boolean(cfg.clientId && cfg.clientSecret),
    appBaseUrl,

    buildAuthorizeUrl(state) {
      const params = new URLSearchParams({
        client_id: cfg.clientId,
        redirect_uri: cfg.redirectUri,
        scope: normalizeScopes(cfg.scopes, ','),
        response_type: 'code',
        state,
      });
      return `${cfg.imsOrigin}/ims/authorize/v2?${params.toString()}`;
    },

    async exchangeCode(code) {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        code,
      });
      const res = await fetch(`${cfg.imsOrigin}/ims/token/v3`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body,
      });
      if (!res.ok) {
        throw new Error(
          `Adobe token exchange failed: ${res.status} ${await res.text().catch(() => '')}`
        );
      }
      const data = (await res.json()) as {
        access_token: string;
        expires_in?: number;
      };
      // IMS reports expires_in in milliseconds already.
      return { accessToken: data.access_token, expiresInMs: data.expires_in };
    },

    async fetchUserInfo(token) {
      const url = `${cfg.imsOrigin}/ims/userinfo/v2?client_id=${encodeURIComponent(cfg.clientId)}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          Accept: 'application/json',
        },
      });
      if (!res.ok) {
        throw new Error(
          `Adobe userinfo failed: ${res.status} ${await res.text().catch(() => '')}`
        );
      }
      const data = (await res.json()) as Record<string, unknown>;
      const name =
        field(data, 'name') ||
        [field(data, 'given_name'), field(data, 'family_name')]
          .filter(Boolean)
          .join(' ') ||
        field(data, 'email') ||
        'Adobe User';
      return {
        id: field(data, 'sub') || field(data, 'email') || 'adobe-user',
        name,
        email: field(data, 'email'),
        avatarUrl: field(data, 'picture'),
        demo: false,
        provider: label,
      };
    },
  };
}

/** Google (OIDC). `expires_in` is in seconds and the token call needs redirect_uri. */
function googleProvider(cfg: ProviderConfig, appBaseUrl: string): AuthProvider {
  const label = 'Google';
  return {
    id: 'google',
    label,
    isConfigured: Boolean(cfg.clientId && cfg.clientSecret),
    appBaseUrl,

    buildAuthorizeUrl(state) {
      const params = new URLSearchParams({
        client_id: cfg.clientId,
        redirect_uri: cfg.redirectUri,
        scope: normalizeScopes(cfg.scopes || 'openid email profile', ' '),
        response_type: 'code',
        access_type: 'online',
        prompt: 'select_account',
        state,
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    },

    async exchangeCode(code) {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: cfg.redirectUri,
        code,
      });
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body,
      });
      if (!res.ok) {
        throw new Error(
          `Google token exchange failed: ${res.status} ${await res.text().catch(() => '')}`
        );
      }
      const data = (await res.json()) as {
        access_token: string;
        expires_in?: number;
      };
      return {
        accessToken: data.access_token,
        // Google reports expires_in in seconds — convert to ms.
        expiresInMs:
          typeof data.expires_in === 'number'
            ? data.expires_in * 1000
            : undefined,
      };
    },

    async fetchUserInfo(token) {
      const res = await fetch(
        'https://openidconnect.googleapis.com/v1/userinfo',
        {
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            Accept: 'application/json',
          },
        }
      );
      if (!res.ok) {
        throw new Error(
          `Google userinfo failed: ${res.status} ${await res.text().catch(() => '')}`
        );
      }
      const data = (await res.json()) as Record<string, unknown>;
      const name =
        field(data, 'name') ||
        [field(data, 'given_name'), field(data, 'family_name')]
          .filter(Boolean)
          .join(' ') ||
        field(data, 'email') ||
        'Google User';
      return {
        id: field(data, 'sub') || field(data, 'email') || 'google-user',
        name,
        email: field(data, 'email'),
        avatarUrl: field(data, 'picture'),
        demo: false,
        provider: label,
      };
    },
  };
}

/**
 * Resolve auth configuration from `process.env` at RUNTIME.
 *
 * Deliberately NOT via `useRuntimeConfig()`: Nitro evaluates the runtimeConfig
 * literal in `nitro.config.ts` (`process.env.X ?? default`) at *build* time and
 * freezes the result into the bundle. In the production Docker build the OAuth
 * credentials aren't present, so they'd bake as empty and `demoMode` would be
 * stuck on regardless of the deployed `.env`. The root `.env` is loaded into
 * `process.env` at startup by the `0.env` plugin, so reading it here picks up
 * the real per-deploy values without rebuilding the image — and keeps the
 * client secret out of image layers.
 */
export function getAuthConfig(): AuthRuntimeConfig {
  return {
    provider: process.env.AUTH_PROVIDER ?? 'adobe',
    appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',
    adobe: {
      clientId: process.env.ADOBE_CLIENT_ID ?? '',
      clientSecret: process.env.ADOBE_CLIENT_SECRET ?? '',
      redirectUri:
        process.env.ADOBE_REDIRECT_URI ?? 'http://localhost:3000/auth/callback',
      imsOrigin:
        process.env.ADOBE_IMS_ORIGIN ?? 'https://ims-na1.adobelogin.com',
      scopes: process.env.ADOBE_SCOPES ?? 'openid,AdobeID,profile,email',
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirectUri:
        process.env.GOOGLE_REDIRECT_URI ??
        'http://localhost:3000/auth/callback',
      // Unused for Google (endpoints are fixed) but kept for config symmetry.
      imsOrigin: '',
      scopes: process.env.GOOGLE_SCOPES ?? 'openid email profile',
    },
  };
}

/** Resolve the provider selected by `AUTH_PROVIDER` (defaults to Adobe). */
export function getActiveProvider(): AuthProvider {
  const auth = getAuthConfig();
  const selected = (auth.provider || 'adobe').toLowerCase();
  if (selected === 'google') {
    return googleProvider(auth.google, auth.appBaseUrl);
  }
  return adobeProvider(auth.adobe, auth.appBaseUrl);
}
