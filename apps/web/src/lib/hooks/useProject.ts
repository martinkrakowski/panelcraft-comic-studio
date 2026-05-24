import { useState, useEffect, useCallback, useRef } from "react";
import api from "../api";
import { ComicProjectDTO } from "@panelcraft/types";
import { useMountEffect } from "./useMountEffect";

/**
 * Semantic helper hook to poll project status at intervals when active background generation is processing.
 * Satisfies the "War on useEffect" guidelines by isolating external timer synchronization.
 * 
 * @param isGenerating - Whether the project is currently in a generating state.
 * @param fetchProject - Callback function to fetch the project.
 */
function useProjectPolling(
  isGenerating: boolean,
  fetchProject: (silent?: boolean) => Promise<any>
) {
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isGenerating) {
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => {
          fetchProject(true); // Silent reload
        }, 3000);
      }
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isGenerating, fetchProject]);
}

/**
 * Custom React hook to fetch and synchronize details of a specific comic project.
 * Handles background polling while rendering/generation is in-flight on the server.
 * Handles race conditions and stale requests on mid-request id changes.
 * 
 * @param id - The UUID of the project.
 * @returns Project DTO, loading/error states, and refetch callbacks.
 */
export function useProject(id: string) {
  const [project, setProject] = useState<ComicProjectDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const inFlightRequestRef = useRef<{ id: string; promise: Promise<ComicProjectDTO | null> } | null>(null);

  const fetchProject = useCallback(async (silent = false) => {
    // If there is an active in-flight request for the SAME project id, return its promise
    if (inFlightRequestRef.current && inFlightRequestRef.current.id === id) {
      return inFlightRequestRef.current.promise;
    }

    if (!silent) setLoading(true);

    const promise = api.getProject(id)
      .then((res) => {
        setProject(res.project);
        setError(null);
        return res.project;
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error("Failed to fetch project"));
        return null;
      })
      .finally(() => {
        // Only clear the in-flight reference if it hasn't been overwritten by a new request id
        if (inFlightRequestRef.current?.id === id) {
          inFlightRequestRef.current = null;
        }
        if (!silent) setLoading(false);
      });

    inFlightRequestRef.current = { id, promise };
    return promise;
  }, [id]);

  // Initial fetch on mount or id change
  useMountEffect(() => {
    fetchProject();
  });

  const isGenerating = !!(project && (
    project.status === "created" || 
    project.status === "processing"
  ));

  // Delegate background status checking to the semantic polling hook
  useProjectPolling(isGenerating, fetchProject);

  return {
    project,
    loading,
    error,
    refetch: () => fetchProject(false),
    refreshSilent: () => fetchProject(true),
  };
}
