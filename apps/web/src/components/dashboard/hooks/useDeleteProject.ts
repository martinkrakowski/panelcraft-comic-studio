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
    // Outer try/finally guarantees the in-flight ref + deleting flag are
    // cleared on every exit path (delete-error early return, refetch
    // failure, or full success).
    try {
      // Delete attempt — its own catch so refetch failures below don't
      // get misreported as "Delete failed".
      try {
        await api.deleteProject(id);
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Delete failed',
          description:
            err instanceof Error
              ? err.message
              : 'Could not delete the project.',
        });
        return;
      }

      toast({
        variant: 'success',
        title: 'Project deleted',
        description: 'The comic and its assets have been removed.',
      });

      // Refetch is best-effort — the project is already gone from the DB
      // at this point, so failure here is a stale-UI issue, not a
      // delete failure.
      try {
        await refetchProjects();
      } catch {
        toast({
          variant: 'destructive',
          title: 'List refresh failed',
          description:
            'The project was deleted, but refreshing the list failed. Please reload.',
        });
      }
    } finally {
      setDeleting(false);
      inFlightRef.current = false;
    }
  };

  return { deleteProject, deleting };
}
