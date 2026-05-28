'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@panelcraft/ui';
import { LayoutGrid, Sparkles } from 'lucide-react';
import { useEffectOnce, useUnmountEffect } from '../../lib/hooks';
import { hasSeenSplash, markSplashSeen } from '../../lib/splash';
import styles from './DashboardSplash.module.css';

/**
 * Splash overlay shown once per browser session for returning users who land
 * on the dashboard with an existing session (skipping the login chooser).
 * "Seen" state is tracked in sessionStorage (see lib/splash), so reloads no
 * longer re-prompt and the login chooser can pre-empt it. Dismissed by the
 * buttons or Escape.
 *
 * @component
 * @returns The modal splash overlay, or null when not visible.
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
    // Bail before touching the DOM when the splash won't show this session —
    // otherwise we'd leave a global keydown listener installed for nothing
    // (common now that the login flow pre-marks the splash seen).
    if (hasSeenSplash()) return;
    markSplashSeen();
    setVisible(true);

    // Escape-to-dismiss is only needed while the splash can be visible.
    onKeyRef.current = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visibleRef.current) setVisible(false);
    };
    window.addEventListener('keydown', onKeyRef.current);
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
