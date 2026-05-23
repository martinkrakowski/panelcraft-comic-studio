import { useState } from "react";
import api from "../api";
import { CreateProjectInput } from "@panelcraft/types";

export function useCreateProject() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createProject = async (input: CreateProjectInput) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.createProject(input);
      return res;
    } catch (err) {
      const finalErr = err instanceof Error ? err : new Error("Failed to create project");
      setError(finalErr);
      throw finalErr;
    } finally {
      setLoading(false);
    }
  };

  return {
    createProject,
    loading,
    error,
  };
}
