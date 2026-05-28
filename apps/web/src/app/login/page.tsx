'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, LogIn, LayoutGrid, Sparkles } from 'lucide-react';
import { Button, useToast } from '@panelcraft/ui';
import {
  authLoginUrl,
  POST_LOGIN_RETURN_KEY,
  safeReturnTo,
} from '../../lib/auth-client';
import { markSplashSeen } from '../../lib/splash';
import { useEffectOnce } from '../../lib/hooks';
import { useAuth } from '../../providers/AuthProvider';
import { VaroVideoTile } from '../../components/shared/VaroVideoTile';

type LoginIntent = 'create' | 'browse';

/** A selectable destination option in the login chooser. */
function IntentOption({
  selected,
  onSelect,
  icon,
  label,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
        selected
          ? 'border-indigo-500 bg-indigo-500/10 text-white'
          : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800/60'
      }`}
    >
      <span className={selected ? 'text-indigo-400' : 'text-slate-500'}>
        {icon}
      </span>
      {label}
    </button>
  );
}

function CenteredSpinner() {
  return (
    <section className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
    </section>
  );
}

/** One-shot client redirect — only rendered once the destination is known. */
function RedirectTo({ path }: { path: string }) {
  const router = useRouter();
  useEffectOnce(() => router.replace(path));
  return <CenteredSpinner />;
}

/** Google's four-colour "G" mark. */
function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.711H.957v2.332A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A9 9 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A9 9 0 0 0 .957 4.962L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

function LoginScreen() {
  const params = useSearchParams();
  // Constrain to a same-origin path — never trust the raw query param.
  const returnTo = safeReturnTo(params.get('returnTo'));
  const { status, demoMode, providerLabel, signInMock } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  // What the user wants to do after signing in. "create" always heads to the
  // wizard; "browse" honors any deep-link returnTo (else the dashboard).
  const [intent, setIntent] = useState<LoginIntent>('browse');
  const destination = intent === 'create' ? '/new' : returnTo;

  if (status === 'loading') return <CenteredSpinner />;
  // Already signed in (e.g. navigated to /login directly) — bounce onward.
  if (status === 'authenticated') return <RedirectTo path={returnTo} />;

  const handleProviderSignIn = () => {
    // The choice is made here, so the post-login dashboard shouldn't re-prompt
    // with the splash chooser.
    markSplashSeen();
    // Stash the destination so /auth/callback can return the user here after
    // the cross-origin OAuth round-trip.
    try {
      window.sessionStorage.setItem(POST_LOGIN_RETURN_KEY, destination);
    } catch {
      // sessionStorage unavailable (private mode, etc.) — callback falls back to '/'.
    }
    window.location.href = authLoginUrl;
  };

  const handleDemoSignIn = async () => {
    setBusy(true);
    try {
      const user = await signInMock();
      markSplashSeen();
      const firstName = user.name.split(' ')[0] || user.name;
      toast({
        title: `Welcome back, ${firstName}`,
        description: 'Varo is ready.',
      });
      router.replace(destination);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Sign-in failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
      setBusy(false);
    }
  };

  const isGoogle = providerLabel === 'Google';

  return (
    <section className="flex min-h-[50vh] items-center justify-center">
      <div className="flex max-w-md flex-col items-center gap-8 p-8 text-center">
        <VaroVideoTile className="w-full max-w-sm" />

        <div className="flex w-full max-w-xs flex-col items-center gap-5">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-white">
              Welcome to Varo AI - Panelcraft Studio
            </h1>
            <p className="text-sm text-slate-400">
              What would you like to do? You&apos;ll sign in to continue — your
              projects stay private to your account.
            </p>
          </div>

          <div
            role="radiogroup"
            aria-label="What would you like to do?"
            className="w-full space-y-2"
          >
            <IntentOption
              selected={intent === 'browse'}
              onSelect={() => setIntent('browse')}
              icon={<LayoutGrid className="h-4 w-4" />}
              label="Browse the workspace"
            />
            <IntentOption
              selected={intent === 'create'}
              onSelect={() => setIntent('create')}
              icon={<Sparkles className="h-4 w-4" />}
              label="Create a new comic"
            />
          </div>

          {demoMode ? (
            <Button
              variant="default"
              size="lg"
              disabled={busy}
              onClick={handleDemoSignIn}
              className="w-full"
            >
              <LogIn className="h-4 w-4" />
              Sign in (Demo)
            </Button>
          ) : isGoogle ? (
            <button
              type="button"
              onClick={handleProviderSignIn}
              className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors duration-200 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              <GoogleMark />
              Sign in with Google
            </button>
          ) : (
            <button
              type="button"
              onClick={handleProviderSignIn}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              <LogIn className="h-4 w-4" />
              Sign in with {providerLabel}
            </button>
          )}

          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Secured by OAuth 2.0
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Login screen unauthenticated visitors are redirected to. Offers provider
 * sign-in (Google) or, when no IdP is configured, a Demo Mode sign-in.
 *
 * @returns React.Element centered login card.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<CenteredSpinner />}>
      <LoginScreen />
    </Suspense>
  );
}
