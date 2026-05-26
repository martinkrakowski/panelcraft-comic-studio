'use client';

import { useRef, useState } from 'react';
import { useToast } from '@panelcraft/ui';
import api from '../../../lib/api';

interface UseLayoutActionsArgs {
  projectId: string;
  refreshSilent: () => Promise<unknown>;
}

interface UseLayoutActionsReturn {
  onSelectLayout: (layout: string) => Promise<void>;
  selectingLayout: boolean;
}

/**
 * Focused hook for layout selection actions.
 */
export function useLayoutActions({
  projectId,
  refreshSilent,
}: UseLayoutActionsArgs): UseLayoutActionsReturn {
  const { toast } = useToast();

  const [selectingLayout, setSelectingLayout] = useState(false);
  const selectingLayoutRef = useRef(false);

  const onSelectLayout = async (layout: string) => {
    if (selectingLayoutRef.current) return;
    selectingLayoutRef.current = true;
    setSelectingLayout(true);

    try {
      await api.selectLayout(projectId, layout);
      toast({
        variant: 'success',
        title: 'Layout selected',
        description: 'Resuming workflow to generate panels.',
      });
      await refreshSilent();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Layout selection failed',
        description: err instanceof Error ? err.message : 'An error occurred.',
      });
    } finally {
      setSelectingLayout(false);
      selectingLayoutRef.current = false;
    }
  };

  return {
    onSelectLayout,
    selectingLayout,
  };
}
