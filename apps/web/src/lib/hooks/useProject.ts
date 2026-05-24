import { useState, useCallback, useRef } from 'react';
import api from '../api';
import { ComicProjectDTO } from '@panelcraft/types';
import { useMountEffect } from './useMountEffect';
import { usePolling } from './usePolling';

/**
 * Custom React hook to fetch and synchronize details of a specific comic project.
 * Handles background polling while rendering/generation is in-flight on the server.
 * Handles race conditions and stale requests on mid-request id changes by ignoring
 * responses from prior id requests.
 *
 * @param id - The UUID of the project to retrieve.
 * @returns Object containing project state and utility methods.
 * @returns.project - The ComicProjectDTO object or null if not loaded yet.
 * @returns.loading - Boolean indicating whether a non-silent fetch is in progress.
 * @returns.error - Error object if fetching failed, or null.
 * @returns.refetch - Function to trigger a manual, non-silent project fetch.
 * @returns.refreshSilent - Function to trigger a background, silent project fetch.
 *
 * @example
 * const { project, loading, error } = useProject("project-uuid-123");
 */
export function useProject(id: string) {
  const [project, setProject] = useState<ComicProjectDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const inFlightRequestRef = useRef<{
    id: string;
    promise: Promise<ComicProjectDTO | null>;
  } | null>(null);
  const currentIdRef = useRef(id);

  // Sync currentIdRef with the latest id passed to the hook
  currentIdRef.current = id;

  const fetchProject = useCallback(
    async (silent = false) => {
      // If there is an active in-flight request for the SAME project id, return its promise
      if (inFlightRequestRef.current && inFlightRequestRef.current.id === id) {
        return inFlightRequestRef.current.promise;
      }

      if (!silent) setLoading(true);

      const promise = api
        .getProject(id)
        .then((res) => {
          // Discard response if hook's target project id changed in the meantime
          if (currentIdRef.current !== id) return null;
          setProject(res.project);
          setError(null);
          return res.project;
        })
        .catch((err) => {
          // Discard error if hook's target project id changed in the meantime
          if (currentIdRef.current !== id) return null;
          setError(
            err instanceof Error ? err : new Error('Failed to fetch project')
          );
          return null;
        })
        .finally(() => {
          // Discard state changes if hook's target project id changed in the meantime
          if (currentIdRef.current !== id) return;

          // Only clear the in-flight reference if it hasn't been overwritten by a new request id
          if (inFlightRequestRef.current?.id === id) {
            inFlightRequestRef.current = null;
          }
          if (!silent) setLoading(false);
        });

      inFlightRequestRef.current = { id, promise };
      return promise;
    },
    [id]
  );

  // Initial fetch on mount or id change
  useMountEffect(() => {
    fetchProject();
  });

  const isGenerating = !!(
    project &&
    (project.status === 'created' || project.status === 'processing')
  );

  // Delegate background status checking to the semantic polling hook
  usePolling(
    () => {
      fetchProject(true);
    },
    { enabled: isGenerating, intervalMs: 3000 }
  );

  return {
    project,
    loading,
    error,
    refetch: () => fetchProject(false),
    refreshSilent: () => fetchProject(true),
  };
}
