'use client';

import { useEffect, useState } from 'react';
import { Button } from '@panelcraft/ui';

/**
 * Splash overlay shown only when the user **reloads** the dashboard via the
 * browser (Cmd+R / F5). Initial navigation, back/forward, and route changes
 * do not trigger it. Dismissed by the "Begin" button or Escape.
 */
export function DashboardSplash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const entries = performance.getEntriesByType('navigation');
    const navEntry = entries[0] as PerformanceNavigationTiming | undefined;
    if (navEntry?.type === 'reload') setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVisible(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]);

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
        <video
          autoPlay
          muted
          playsInline
          aria-label="Varo AI logo"
          className="w-full max-w-sm rounded-xl"
        >
          <source src="/varo-ai-logo.webm" type="video/webm" />
        </video>
        <Button
          type="button"
          onClick={() => setVisible(false)}
          size="lg"
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-10"
        >
          Begin
        </Button>
      </div>
    </div>
  );
}
