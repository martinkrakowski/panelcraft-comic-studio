"use client";

import { useEffect } from "react";
import { Alert, AlertTitle, AlertDescription, Button } from "@panelcraft/ui";
import { RefreshCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 text-center">
      <Alert variant="destructive" className="max-w-md">
        <AlertTitle className="text-lg">Something went wrong!</AlertTitle>
        <AlertDescription className="mt-2 text-sm opacity-90">
          {error.message || "An unexpected error occurred while rendering this workspace."}
        </AlertDescription>
      </Alert>
      <Button
        onClick={() => reset()}
        className="flex items-center gap-2 font-semibold shadow-md"
      >
        <RefreshCcw className="h-4.5 w-4.5" />
        Try again
      </Button>
    </div>
  );
}
