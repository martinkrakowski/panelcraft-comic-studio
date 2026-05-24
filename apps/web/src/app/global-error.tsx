'use client';

import React, { useRef } from 'react';
import { Button } from '@panelcraft/ui';
import { AlertCircle, RefreshCcw } from 'lucide-react';

/**
 * Root-level global error fallback page component acting as the application-level error boundary.
 * Renders a user-safe fallback page in production to prevent leaking raw system exception messages.
 *
 * @component
 * @param props - Component properties.
 * @param props.error - Error object containing the exception message and optional security digest tracking tag.
 * @param props.reset - Callback function to trigger resetting the error boundary.
 * @returns React.Element containing HTML structure for the critical error landing page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const logged = useRef(false);
  if (!logged.current) {
    console.error('Root layout critical crash captured:', error);
    logged.current = true;
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md space-y-6">
          <div className="inline-flex p-4 bg-red-950/20 border border-red-500/30 rounded-full text-red-400">
            <AlertCircle className="h-10 w-10 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">
              Critical System Error
            </h1>
            <p className="text-sm text-slate-400">
              An unexpected critical error occurred at the system root level.
              Please try restarting the application.
            </p>
          </div>
          <Button
            onClick={() => reset()}
            className="bg-indigo-600 hover:bg-indigo-500 font-semibold shadow-md flex items-center gap-2 mx-auto"
          >
            <RefreshCcw className="h-4 w-4" />
            Restart Application
          </Button>
        </div>
      </body>
    </html>
  );
}
