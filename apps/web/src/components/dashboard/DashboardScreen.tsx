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
import { DashboardSplash } from './DashboardSplash';
import { DashboardFilterBar } from './DashboardFilterBar';
import { useDashboardFilters } from './hooks/useDashboardFilters';

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

  // Filter state is owned here (not in DashboardBody) so the topStrip count and
  // filter bar share it with the grid. Called unconditionally to respect the
  // rules of hooks — harmless on the loading/error/empty paths.
  const filterState = useDashboardFilters(projects);

  // Once the initial fetch settles and there are no projects, send the user
  // into the wizard. Guarded on !loading so the redirect doesn't fire on the
  // first render before fetch completes, and on !error so a network failure
  // shows the error+retry state instead of silently bouncing. Note this checks
  // the *unfiltered* list, so narrowing filters to zero matches shows the
  // "no matches" empty state rather than bouncing the user to the wizard.
  if (!loadingProjects && !errorProjects && projects.length === 0) {
    redirect('/new');
  }

  const showFilters = !loadingProjects && !errorProjects && projects.length > 0;

  return (
    <>
      <DashboardSplash />
      <AppCanvasOnePane
        topStrip={
          <div className="flex-shrink-0 px-4 pt-4 pb-3 space-y-3 border-b border-slate-800/60">
            <div className="space-y-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Shared Project Workspace
              </h1>
              {showFilters && (
                <p className="text-xs text-slate-500">
                  {filterState.activeCount > 0
                    ? `${filterState.filtered.length} of ${projects.length} `
                    : `${projects.length} `}
                  {projects.length === 1
                    ? 'community project'
                    : 'community projects'}
                </p>
              )}
            </div>
            {showFilters && (
              <DashboardFilterBar
                filters={filterState.filters}
                availableGenres={filterState.availableGenres}
                availableTones={filterState.availableTones}
                availableStatuses={filterState.availableStatuses}
                setSearch={filterState.setSearch}
                toggleGenre={filterState.toggleGenre}
                toggleTone={filterState.toggleTone}
                setStatus={filterState.setStatus}
                setDateRange={filterState.setDateRange}
                activeCount={filterState.activeCount}
                clearAll={filterState.clearAll}
              />
            )}
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
          projects={filterState.filtered}
          filtersActive={filterState.activeCount > 0}
          onClearFilters={filterState.clearAll}
          onRetry={refetchProjects}
        />
      </AppCanvasOnePane>
    </>
  );
}

interface DashboardBodyProps {
  loading: boolean;
  error: Error | null;
  projects: ReturnType<typeof useWorkspace>['projects'];
  filtersActive: boolean;
  onClearFilters: () => void;
  onRetry: () => void;
}

/**
 * State switch for the scrollable content area. Kept separate from the
 * AppCanvas chrome above so each state can decide its own padding /
 * alignment without re-declaring the outer layout. The unfiltered zero-project
 * case is handled upstream via redirect, so this renders loading / error /
 * no-matches / grid. `projects` here is the already-filtered list.
 */
function DashboardBody({
  loading,
  error,
  projects,
  filtersActive,
  onClearFilters,
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
  // Filtered to nothing — distinct from the unfiltered empty case (which
  // redirects), so offer a way back rather than an action to create.
  if (projects.length === 0 && filtersActive) {
    return (
      <div className="px-4 py-16 flex flex-col items-center text-center gap-3">
        <p className="text-sm text-slate-400">
          No projects match your filters.
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 rounded"
        >
          Clear all filters
        </button>
      </div>
    );
  }
  return (
    <div className="px-4 py-6">
      <DashboardGrid projects={projects} />
    </div>
  );
}
