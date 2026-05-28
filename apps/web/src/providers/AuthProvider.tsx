'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { useEffectOnce } from '../lib/hooks';
import {
  getAuthSession,
  exchangeAuthCode,
  authMockLogin,
  authLogout,
  type AuthUser,
} from '../lib/auth-client';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** True when the server has no IdP credentials — a login uses the mock. */
  demoMode: boolean;
  /** Label of the active provider, e.g. "Adobe" or "Google". */
  providerLabel: string;
  /** Establish the offline demo identity. Resolves to the signed-in user. */
  signInMock: () => Promise<AuthUser>;
  /** Finish the real OAuth flow (called by the callback page). */
  completeCode: (code: string, state: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  /** Re-read the session from the server. */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Holds OAuth authentication state for the workspace and exposes the operations
 * the header control and `/auth/callback` page drive. Hydrates once on mount by
 * reading the httpOnly session via the API's `/me` endpoint.
 *
 * @component
 * @param props - Component properties.
 * @param props.children - Subtree that can consume the auth context.
 * @returns React.Element context provider wrapper.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [demoMode, setDemoMode] = useState<boolean>(true);
  const [providerLabel, setProviderLabel] = useState<string>('Adobe');

  const refresh = useCallback(async () => {
    try {
      const session = await getAuthSession();
      setUser(session.user);
      setDemoMode(session.demoMode);
      setProviderLabel(session.label);
      setStatus(session.user ? 'authenticated' : 'unauthenticated');
    } catch {
      // Treat an unreachable/erroring auth service as logged-out rather than
      // blocking the whole app behind a spinner.
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffectOnce(() => {
    void refresh();
  });

  const signInMock = useCallback(async () => {
    const nextUser = await authMockLogin();
    setUser(nextUser);
    setStatus('authenticated');
    return nextUser;
  }, []);

  const completeCode = useCallback(async (code: string, state: string) => {
    const nextUser = await exchangeAuthCode(code, state);
    setUser(nextUser);
    setStatus('authenticated');
    return nextUser;
  }, []);

  const signOut = useCallback(async () => {
    await authLogout();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        demoMode,
        providerLabel,
        signInMock,
        completeCode,
        signOut,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Access the authentication context.
 *
 * @returns The current auth status, user, and sign-in/out operations.
 * @throws {Error} when used outside an `AuthProvider`.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
