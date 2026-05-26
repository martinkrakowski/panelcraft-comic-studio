import { useState } from 'react';
import api from '../api';

/**
 * Custom React hook providing project-creation action state for the wizard flow.
 * Handles multipart form data upload to support image files.
 */
export function useCreateProject() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createProject = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.createProjectMultipart(formData);
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

  const selectLayout = async (projectId: string, layout: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.selectLayout(projectId, layout);
    } catch (err) {
      const finalErr =
        err instanceof Error ? err : new Error('Failed to select layout');
      setError(finalErr);
      throw finalErr;
    } finally {
      setLoading(false);
    }
  };

  return {
    createProject,
    selectLayout,
    loading,
    error,
  };
}
