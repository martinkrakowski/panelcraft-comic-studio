'use client';

import Link from 'next/link';
import {
  Skeleton,
  buttonVariants,
  Alert,
  AlertDescription,
  AlertTitle,
  AppCanvasTwoPane,
} from '@panelcraft/ui';
import { AlertCircle } from 'lucide-react';

/**
 * Complete loading skeleton for the entire editor view.
 * Renders the full AppCanvasTwoPane with sidebar and content skeletons.
 */
export function EditorLoadingState() {
  return (
    <AppCanvasTwoPane
      sidebar={
        <div className="w-full lg:w-[var(--panelcraft-sidebar-width,370px)] shrink-0 overflow-y-auto p-4 pt-20 space-y-4">
          <div className="h-9 rounded bg-slate-800/80 border-b border-slate-700" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      }
      topStrip={
        <>
          <div className="flex-shrink-0 px-4 pt-4 pb-3 space-y-2 border-b border-slate-800/60">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-3 w-32" />
          </div>
          {/* Status strip placeholder (prevents pop when real strip mounts) */}
          <div className="flex-shrink-0 h-12 px-4 bg-slate-900/30" />
        </>
      }
      footer={
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-4 border-t border-slate-800/60 bg-slate-900/40">
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      }
    >
      <div className="px-4 pb-8 space-y-6 pt-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </AppCanvasTwoPane>
  );
}

/**
 * Complete error state for when a project fails to load.
 * Renders the full AppCanvasTwoPane with a minimal sidebar spacer and centered error.
 */
export function EditorErrorState({ message }: { message?: string }) {
  return (
    <AppCanvasTwoPane
      sidebar={
        <div className="w-full lg:w-[var(--panelcraft-sidebar-width,370px)] shrink-0 pt-20" />
      }
    >
      <div className="h-full flex items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Failed to Load Project</AlertTitle>
          <AlertDescription>
            {message || 'This project could not be loaded.'}
          </AlertDescription>
          <div className="mt-4">
            <Link
              href="/"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Back to Dashboard
            </Link>
          </div>
        </Alert>
      </div>
    </AppCanvasTwoPane>
  );
}
