import { useState, useCallback } from 'react';
import api from '../api';
import { ProjectListResponse } from '@panelcraft/types';
import { useEffectOnce } from './useEffectOnce';

/**
 * Custom React hook to retrieve and manage the list of all comic book projects.
 * Automatically initiates a project fetch request upon mounting via an internal callback `fetchProjects`.
 *
 * @returns Object containing the lists and tracking parameters:
 * @returns.projects - Array of ProjectSummaryDTO objects, defaults to empty array.
 * @returns.loading - Boolean indicating whether a non-silent fetch is actively running.
 * @returns.error - Error object if the API request fails, or null.
 * @returns.refetch - Function to trigger a manual, non-silent project reload (sets loading to true).
 * @returns.refreshSilent - Function to trigger a background, silent project reload (does not set loading to true).
 */
export function useProjects() {
  const [data, setData] = useState<ProjectListResponse | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffectOnce(() => {
    fetchProjects();
  });

  return {
    projects: data?.projects || [],
    loading,
    error,
    refetch: () => fetchProjects(false),
    refreshSilent: () => fetchProjects(true),
  };
}
