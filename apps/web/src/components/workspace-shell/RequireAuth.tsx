'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useEffectOnce } from '../../lib/hooks';
import { useAuth } from '../../providers/AuthProvider';

function CenteredSpinner() {
  return (
    <section className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
    </section>
  );
}

/**
 * Mounts only once the visitor is known to be unauthenticated, so a one-time
 * redirect to the login screen is safe. Reads the attempted URL (path + query)
 * from `window.location` — avoiding `useSearchParams`, which would force the
 * whole app (this gate lives in the layout) into client-side rendering — so
 * deep links restore after sign-in.
 */
function RedirectToLogin() {
  const router = useRouter();
  useEffectOnce(() => {
    const here = `${window.location.pathname}${window.location.search}`;
    const qs =
      here && here !== '/' ? `?returnTo=${encodeURIComponent(here)}` : '';
    router.replace(`/login${qs}`);
  });
  return <CenteredSpinner />;
}

/**
 * Gates protected content: unauthenticated visitors are redirected to
 * `/login`. The login screen and the OAuth callback render without a session
 * (the callback must complete the exchange while logged out), and a spinner
 * shows while the session is still hydrating.
 *
 * @component
 * @param props - Component props.
 * @param props.children - Protected subtree, rendered only when authenticated.
 * @returns React.Element gate around the protected content.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const pathname = usePathname();

  if (pathname === '/login' || pathname?.startsWith('/auth')) {
    return <>{children}</>;
  }

  if (status === 'loading') return <CenteredSpinner />;
  if (status === 'unauthenticated') {
    return <RedirectToLogin />;
  }
  return <>{children}</>;
}
