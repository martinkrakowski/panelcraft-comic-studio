import { useState, useEffect, useCallback } from "react";
import api from "../api";
import { ProjectListResponse } from "@panelcraft/types";

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

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects: data?.projects || [],
    loading,
    error,
    refetch: () => fetchProjects(false),
    refreshSilent: () => fetchProjects(true),
  };
}
