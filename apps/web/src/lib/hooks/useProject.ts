import { useState, useEffect, useCallback, useRef } from "react";
import api from "../api";
import { ComicProjectDTO } from "@panelcraft/types";

export function useProject(id: string) {
  const [project, setProject] = useState<ComicProjectDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRequestRef = useRef<Promise<any> | null>(null);

  const fetchProject = useCallback(async (silent = false) => {
    if (inFlightRequestRef.current) {
      return inFlightRequestRef.current;
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
        inFlightRequestRef.current = null;
        if (!silent) setLoading(false);
      });

    inFlightRequestRef.current = promise;
    return promise;
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Polling setup: triggers only when project generation is active in the background
  useEffect(() => {
    const isGenerating = project && (
      project.status === "created" || 
      project.status === "processing"
    );

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
  }, [project, fetchProject]);

  return {
    project,
    loading,
    error,
    refetch: () => fetchProject(false),
    refreshSilent: () => fetchProject(true),
  };
}
