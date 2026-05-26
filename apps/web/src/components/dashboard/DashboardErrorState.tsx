'use client';

import { Alert, AlertDescription, AlertTitle, Button } from '@panelcraft/ui';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface DashboardErrorStateProps {
  message?: string;
  onRetry: () => void;
}

/**
 * Centered error card with a retry action. Used when `useWorkspace().errorProjects`
 * is set — typically a network failure on the initial list fetch.
 */
export function DashboardErrorState({
  message,
  onRetry,
}: DashboardErrorStateProps) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>Couldn&rsquo;t load your comics</AlertTitle>
        <AlertDescription>
          {message || 'The project list request failed. Try again.'}
        </AlertDescription>
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </Alert>
    </div>
  );
}
