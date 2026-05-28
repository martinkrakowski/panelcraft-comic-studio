'use client';

import { useState } from 'react';
import { useToast } from '@panelcraft/ui';
import api from '../../../lib/api';
import { useWorkspace } from '../../../providers/WorkspaceProvider';

interface UseShareProjectReturn {
  /** Toggle sharing for a project, then refresh the list + toast feedback. */
  setShared: (id: string, shared: boolean) => Promise<void>;
  /** True while a share toggle request is in flight. */
  updating: boolean;
}

/**
 * Action hook for the dashboard's "Share It" toggle. Wraps the share request,
 * refetch-on-success, and toast plumbing so the card stays focused on UI.
 */
export function useShareProject(): UseShareProjectReturn {
  const { toast } = useToast();
  const { refetchProjects } = useWorkspace();
  const [updating, setUpdating] = useState(false);

  const setShared = async (id: string, shared: boolean) => {
    setUpdating(true);
    try {
      await api.shareProject(id, shared);
      toast({
        variant: 'success',
        title: shared ? 'Comic shared' : 'Sharing turned off',
        description: shared
          ? 'This comic is now visible to everyone.'
          : 'This comic is private to you again.',
      });
      // Best-effort refresh — the change is already persisted.
      try {
        await refetchProjects();
      } catch {
        /* stale-UI only; the toggle succeeded */
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description:
          err instanceof Error ? err.message : 'Could not update sharing.',
      });
    } finally {
      setUpdating(false);
    }
  };

  return { setShared, updating };
}
