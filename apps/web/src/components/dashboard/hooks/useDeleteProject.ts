'use client';

import { useRef, useState } from 'react';
import { useToast } from '@panelcraft/ui';
import api from '../../../lib/api';
import { useWorkspace } from '../../../providers/WorkspaceProvider';

interface UseDeleteProjectReturn {
  /**
   * Delete the project with the given id, refresh the workspace project
   * list on success, and surface toast feedback. Suppresses duplicate
   * in-flight calls for the same id.
   */
  deleteProject: (id: string) => Promise<void>;
  /** True while a delete request is in flight. */
  deleting: boolean;
}

/**
 * Action hook for the dashboard's delete affordance. Encapsulates the
 * fetch, in-flight guard, refetch-on-success, and toast plumbing so the
 * card / dialog components stay focused on UI.
 *
 * Refetches the workspace project list via `WorkspaceProvider` after a
 * successful delete so the deleted card disappears without a hard reload.
 */
export function useDeleteProject(): UseDeleteProjectReturn {
  const { toast } = useToast();
  const { refetchProjects } = useWorkspace();
  const [deleting, setDeleting] = useState(false);
  const inFlightRef = useRef(false);

  const deleteProject = async (id: string) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setDeleting(true);
    try {
      await api.deleteProject(id);
      toast({
        variant: 'success',
        title: 'Project deleted',
        description: 'The comic and its assets have been removed.',
      });
      await refetchProjects();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description:
          err instanceof Error ? err.message : 'Could not delete the project.',
      });
    } finally {
      setDeleting(false);
      inFlightRef.current = false;
    }
  };

  return { deleteProject, deleting };
}
