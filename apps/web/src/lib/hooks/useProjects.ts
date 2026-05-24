import { useState, useCallback } from "react";
import api from "../api";
import { ProjectListResponse } from "@panelcraft/types";
import { useMountEffect } from "./useMountEffect";

/**
 * Custom React hook to retrieve and manage the list of all comic book projects.
 * Automatically fetches data once upon mounting.
 * 
 * @returns Object with projects list, loading state, error state, and refetch callbacks.
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
      setError(err instanceof Error ? err : new Error("Failed to fetch projects"));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useMountEffect(() => {
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
