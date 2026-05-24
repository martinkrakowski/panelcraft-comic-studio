"use client";

import { useRef } from "react";
import { Alert, AlertTitle, AlertDescription, Button } from "@panelcraft/ui";
import { RefreshCcw } from "lucide-react";

/**
 * Workspace page-level error fallback component.
 * Displays a user-safe message and handles retry actions.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const logged = useRef(false);
  if (!logged.current) {
    console.error("Workspace render crash captured:", error);
    logged.current = true;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 text-center">
      <Alert variant="destructive" className="max-w-md">
        <AlertTitle className="text-lg">Something went wrong!</AlertTitle>
        <AlertDescription className="mt-2 text-sm opacity-90">
          An unexpected error occurred while loading this workspace. Please try again.
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
