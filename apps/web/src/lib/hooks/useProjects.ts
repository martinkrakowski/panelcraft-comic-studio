import { useState, useCallback } from 'react';
import api from '../api';
import { ProjectListResponse } from '@panelcraft/types';
import { useEffectOnActivate } from './useEffectOnActivate';

/**
 * Custom React hook to retrieve and manage the list of all comic book projects.
 *
 * The fetch is gated on `enabled` rather than firing on mount: the projects
 * endpoint requires a session, and this provider lives in the root layout above
 * the auth gate, so an on-mount fetch would race the OAuth code exchange and
 * 401 before the session cookie lands (then never retry, since the layout
 * provider doesn't remount on client navigation). Fetching on the
 * unauthenticated→authenticated transition avoids that race.
 *
 * @param enabled - When true, load (and reload on each false→true transition).
 *   Pass `status === 'authenticated'`.
 * @returns Object containing the lists and tracking parameters:
 * @returns.projects - Array of ProjectSummaryDTO objects, defaults to empty array.
 * @returns.loading - Boolean indicating whether a non-silent fetch is actively running.
 * @returns.error - Error object if the API request fails, or null.
 * @returns.refetch - Function to trigger a manual, non-silent project reload (sets loading to true).
 * @returns.refreshSilent - Function to trigger a background, silent project reload (does not set loading to true).
 */
export function useProjects(enabled = true) {
  const [data, setData] = useState<ProjectListResponse | null>(null);
  // Only "loading" when we'll actually fetch (enabled); idle while signed out.
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const fetchProjects = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getProjects();
      setData(res);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to fetch projects')
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // React to auth gain/loss without an effect — a guarded state adjustment
  // during render (React's "reset on prop change" pattern) so the change lands
  // before paint. On logout (true→false) drop the previous session's projects
  // so a later sign-in can't flash them; on login (false→true) enter loading
  // immediately so the dashboard shows a spinner — not an empty state that
  // would wrongly trigger its zero-projects redirect — until the fetch below
  // resolves.
  const [prevEnabled, setPrevEnabled] = useState(enabled);
  if (prevEnabled !== enabled) {
    setPrevEnabled(enabled);
    setData(null);
    setError(null);
    setLoading(enabled);
  }

  // Fire on each false→true transition of `enabled` (initial authenticated
  // mount, or a later sign-in) so re-login after logout reloads too.
  useEffectOnActivate(enabled, () => {
    void fetchProjects();
  });

  return {
    projects: data?.projects || [],
    loading,
    error,
    refetch: () => fetchProjects(false),
    refreshSilent: () => fetchProjects(true),
  };
}
