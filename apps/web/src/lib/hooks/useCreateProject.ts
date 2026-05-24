import { useState } from 'react';
import api from '../api';
import { CreateProjectInput } from '@panelcraft/types';

/**
 * Custom React hook providing project-creation action state and a create operation for UI flows.
 * Returns loading and error states, and exposing a trigger function `createProject`.
 *
 * @returns Object containing the action callbacks and status states:
 * @returns.createProject - Async function accepting CreateProjectInput parameter that registers loading, clears error, and calls api.createProject, returning the API response or throwing an Error.
 * @returns.loading - Boolean indicating whether the project creation is currently in progress.
 * @returns.error - Error object if creation failed, or null.
 */
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
      const finalErr =
        err instanceof Error ? err : new Error('Failed to create project');
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
