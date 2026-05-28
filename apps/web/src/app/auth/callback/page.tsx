'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { buttonVariants, useToast } from '@panelcraft/ui';
import { useEffectOnce } from '../../../lib/hooks';
import { useAuth } from '../../../providers/AuthProvider';

function CallbackStatus({
  icon,
  title,
  detail,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-800/80 bg-slate-900/60 px-8 py-10 backdrop-blur-md">
        {icon}
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-white">{title}</h1>
          <p className="max-w-sm text-sm text-slate-400">{detail}</p>
        </div>
        {action}
      </div>
    </section>
  );
}

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const { completeCode, signInMock } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // useEffectOnce is single-execution even under Strict Mode — the code is
  // single-use, so we must not exchange it twice.
  useEffectOnce(() => {
    const run = async () => {
      const oauthError = params.get('error_description') || params.get('error');
      const code = params.get('code');
      const state = params.get('state');
      const isMock = params.get('mock') === '1';

      try {
        let user;
        if (isMock) {
          user = await signInMock();
        } else if (oauthError) {
          throw new Error(oauthError);
        } else if (code && state) {
          user = await completeCode(code, state);
        } else {
          throw new Error('Missing authorization parameters.');
        }

        const firstName = user.name.split(' ')[0] || user.name;
        toast({
          title: `Welcome back, ${firstName}`,
          description: 'Varo is ready.',
        });
        router.replace('/');
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Sign-in could not be completed.';
        setError(message);
        toast({
          variant: 'destructive',
          title: 'Sign-in failed',
          description: message,
        });
      }
    };

    void run();
  });

  if (error) {
    return (
      <CallbackStatus
        icon={<AlertTriangle className="h-8 w-8 text-amber-400" />}
        title="We couldn't sign you in"
        detail={error}
        action={
          <Link href="/" className={buttonVariants({ variant: 'outline' })}>
            Return to dashboard
          </Link>
        }
      />
    );
  }

  return (
    <CallbackStatus
      icon={<Loader2 className="h-8 w-8 animate-spin text-indigo-400" />}
      title="Completing sign-in"
      detail="Verifying your Adobe credentials and preparing your workspace."
    />
  );
}

/**
 * OAuth return surface for the Adobe IMS flow (also handles the Demo Mode
 * `?mock=1` bounce). Exchanges the code via the API, then redirects home.
 *
 * @returns React.Element centered sign-in status panel.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <CallbackStatus
          icon={<Loader2 className="h-8 w-8 animate-spin text-indigo-400" />}
          title="Completing sign-in"
          detail="One moment while we finish authenticating you."
        />
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
