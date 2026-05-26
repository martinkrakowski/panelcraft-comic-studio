'use client';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AppCanvasOnePane,
  ContentPanelFooter,
  buttonVariants,
} from '@panelcraft/ui';
import { Sparkles } from 'lucide-react';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import { DashboardGrid } from './DashboardGrid';
import { DashboardLoadingState } from './DashboardLoadingState';
import { DashboardErrorState } from './DashboardErrorState';

/**
 * Home / dashboard surface — replaces the previous `/` → `/new` redirect.
 *
 * Reads the project list from `WorkspaceProvider` (which was already loading
 * it via `useProjects()` but had no consumer). Renders one of three states:
 * loading skeleton, error + retry, or the card grid of project summaries.
 *
 * Zero-project users (first-time or after deleting their last comic) are
 * redirected to `/new` so they always land somewhere with an action to take.
 * `redirect()` from `next/navigation` is safe to call during render in a
 * client component — Next.js intercepts the thrown signal to navigate.
 *
 * The footer carries the primary "New comic" CTA so it stays visible
 * regardless of which inner state is rendered.
 */
export function DashboardScreen() {
  const { projects, loadingProjects, errorProjects, refetchProjects } =
    useWorkspace();

  // Once the initial fetch settles and there are no projects, send the user
  // into the wizard. Guarded on !loading so the redirect doesn't fire on the
  // first render before fetch completes, and on !error so a network failure
  // shows the error+retry state instead of silently bouncing.
  if (!loadingProjects && !errorProjects && projects.length === 0) {
    redirect('/new');
  }

  return (
    <AppCanvasOnePane
      topStrip={
        <div className="flex-shrink-0 px-4 pt-4 pb-3 flex items-center justify-between gap-3 border-b border-slate-800/60">
          <div className="space-y-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Your Comics
            </h1>
            {!loadingProjects && !errorProjects && projects.length > 0 && (
              <p className="text-xs text-slate-500">
                {projects.length}{' '}
                {projects.length === 1 ? 'project' : 'projects'}
              </p>
            )}
          </div>
        </div>
      }
      footer={
        <ContentPanelFooter>
          <span aria-hidden />
          <Link
            href="/new"
            scroll={false}
            className={`${buttonVariants({ size: 'sm' })} bg-indigo-600 hover:bg-indigo-500 text-white inline-flex items-center gap-1.5`}
          >
            <Sparkles className="h-4 w-4" />
            New comic
          </Link>
        </ContentPanelFooter>
      }
    >
      <DashboardBody
        loading={loadingProjects}
        error={errorProjects}
        projects={projects}
        onRetry={refetchProjects}
      />
    </AppCanvasOnePane>
  );
}

interface DashboardBodyProps {
  loading: boolean;
  error: Error | null;
  projects: ReturnType<typeof useWorkspace>['projects'];
  onRetry: () => void;
}

/**
 * State switch for the scrollable content area. Kept separate from the
 * AppCanvas chrome above so each state can decide its own padding /
 * alignment without re-declaring the outer layout. Zero-project case is
 * handled upstream via redirect, so this only renders loading / error /
 * grid.
 */
function DashboardBody({
  loading,
  error,
  projects,
  onRetry,
}: DashboardBodyProps) {
  if (loading) {
    return (
      <div className="px-4 py-6">
        <DashboardLoadingState />
      </div>
    );
  }
  if (error) {
    return <DashboardErrorState message={error.message} onRetry={onRetry} />;
  }
  return (
    <div className="px-4 py-6">
      <DashboardGrid projects={projects} />
    </div>
  );
}
