'use client';

import { useState } from 'react';
import { useToast } from '@panelcraft/ui';
import api from '../../../lib/api';

interface UseRegenerationActionsArgs {
  projectId: string;
  refreshSilent: () => Promise<unknown>;
}

interface UseRegenerationActionsReturn {
  onRegeneratePanel: (panelIndex: number) => Promise<void>;
  regeneratingPanelIndex: number | null;
}

/**
 * Focused hook for single-panel regeneration actions.
 */
export function useRegenerationActions({
  projectId,
  refreshSilent,
}: UseRegenerationActionsArgs): UseRegenerationActionsReturn {
  const { toast } = useToast();

  const [regeneratingPanelIndex, setRegeneratingPanelIndex] = useState<number | null>(null);

  const onRegeneratePanel = async (panelIndex: number) => {
    if (regeneratingPanelIndex !== null) return;
    setRegeneratingPanelIndex(panelIndex);

    try {
      await api.regeneratePanel(projectId, panelIndex);
      toast({
        variant: 'success',
        title: 'Regenerating panel',
        description: `Panel ${panelIndex + 1} is being re-rendered.`,
      });
      await refreshSilent();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Regeneration failed',
        description: err instanceof Error ? err.message : 'An error occurred.',
      });
    } finally {
      setRegeneratingPanelIndex(null);
    }
  };

  return {
    onRegeneratePanel,
    regeneratingPanelIndex,
  };
}
