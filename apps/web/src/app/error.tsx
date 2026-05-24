'use client';

import { useRef, useEffect } from 'react';
import { Alert, AlertTitle, AlertDescription, Button } from '@panelcraft/ui';
import { RefreshCcw } from 'lucide-react';
import { defaultLogger } from '@panelcraft/shared';

/**
 * Workspace page-level error fallback component that acts as the routing boundary UI wrapper.
 * Displays a user-safe alert messaging interface and enables state retry action callbacks.
 *
 * @component
 * @param props - Component properties.
 * @param props.error - Error object instance capturing the execution exception state.
 * @param props.reset - Callback function to trigger resetting the current page routing boundary.
 * @returns React.Element presenting the error notification message and retry button.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const logged = useRef(false);

  useEffect(() => {
    if (!logged.current) {
      defaultLogger.error('Workspace render crash captured:', error);
      logged.current = true;
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 text-center">
      <Alert variant="destructive" className="max-w-md">
        <AlertTitle className="text-lg">Something went wrong!</AlertTitle>
        <AlertDescription className="mt-2 text-sm opacity-90">
          An unexpected error occurred while loading this workspace. Please try
          again.
        </AlertDescription>
      </Alert>
      <Button
        onClick={() => reset()}
        className="flex items-center gap-2 font-semibold shadow-md"
      >
        <RefreshCcw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
