'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@panelcraft/ui';
import { LayoutGrid, Sparkles } from 'lucide-react';
import { useEffectOnce, useUnmountEffect } from '../../lib/hooks';
import styles from './DashboardSplash.module.css';

/**
 * Module-level flag that survives client-side route changes (same JS
 * context) but resets on a real browser reload (fresh JS context). Needed
 * because performance.getEntriesByType('navigation')[0].type stays as
 * 'reload' for the document's whole lifetime — without this guard, the
 * splash would re-fire every time the user navigated back to the dashboard
 * within the same reload-session.
 */
let hasShownThisSession = false;

/**
 * Splash overlay shown only when the user reloads the dashboard via the
 * browser (Cmd+R / F5). Initial navigation, back/forward, and in-app route
 * changes do not trigger it. Dismissed by the buttons or Escape.
 */
export function DashboardSplash() {
  const [visible, setVisible] = useState(false);
  // Refs let the always-on Escape handler read current visibility without
  // re-registering: re-binding on every `visible` toggle would need a raw
  // useEffect with cleanup, which the no-restricted-syntax rule disallows.
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const onKeyRef = useRef<(e: KeyboardEvent) => void>(() => {});

  useEffectOnce(() => {
    onKeyRef.current = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visibleRef.current) setVisible(false);
    };
    window.addEventListener('keydown', onKeyRef.current);

    if (hasShownThisSession) return;
    const entries = performance.getEntriesByType('navigation');
    const navEntry = entries[0] as PerformanceNavigationTiming | undefined;
    if (navEntry?.type !== 'reload') return;
    hasShownThisSession = true;
    setVisible(true);
  });

  useUnmountEffect(() => {
    window.removeEventListener('keydown', onKeyRef.current);
  });

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-splash-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-sm"
    >
      <h2 id="dashboard-splash-title" className="sr-only">
        Welcome to Varo AI
      </h2>
      <div className="flex flex-col items-center gap-8 p-8 max-w-md">
        <div className={`${styles.videoContainer} w-full max-w-sm`}>
          <div className={styles.videoBorderGradient} aria-hidden="true" />
          <div className={styles.videoInner}>
            <video
              autoPlay
              muted
              playsInline
              aria-label="Varo AI logo"
              className={styles.video}
            >
              <source src="/varo-ai-logo.webm" type="video/webm" />
            </video>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <Link
            href="/new"
            scroll={false}
            className={`${buttonVariants({ size: 'lg' })} w-full bg-indigo-600 hover:bg-indigo-500 text-white inline-flex items-center justify-center gap-2`}
          >
            <Sparkles className="h-4 w-4" />
            Create New Comic
          </Link>
          <Button
            type="button"
            onClick={() => setVisible(false)}
            size="lg"
            variant="outline"
            className="w-full gap-2 border-slate-700 bg-slate-900/60 text-slate-100 hover:bg-slate-800 hover:text-white"
          >
            <LayoutGrid className="h-4 w-4" />
            View All Comics
          </Button>
        </div>
      </div>
    </div>
  );
}
