'use client';

import { useRef, useState } from 'react';
import { useToast } from '@panelcraft/ui';
import api from '../../../lib/api';
import type { DialogueEntry, CaptionEntry } from '@panelcraft/types';

interface UseOverlayActionsArgs {
  projectId: string;
  refreshSilent: () => Promise<unknown>;
}

interface UseOverlayActionsReturn {
  onUpdatePanelOverlays: (
    panelIndex: number,
    updates: { dialogue?: DialogueEntry[]; captions?: CaptionEntry[] }
  ) => Promise<void>;
  onUpdateDisplayTitle: (title: string | null) => Promise<void>;
  updatingOverlays: boolean;
}

/**
 * Focused hook for creative overlay mutations (dialogue, captions, and display title).
 * Handles loading state and double-submission guards for these actions.
 */
export function useOverlayActions({
  projectId,
  refreshSilent,
}: UseOverlayActionsArgs): UseOverlayActionsReturn {
  const { toast } = useToast();

  const [updatingOverlays, setUpdatingOverlays] = useState(false);
  const updatingOverlaysRef = useRef(false);

  const onUpdatePanelOverlays = async (
    panelIndex: number,
    updates: { dialogue?: DialogueEntry[]; captions?: CaptionEntry[] }
  ) => {
    if (updatingOverlaysRef.current) return;
    updatingOverlaysRef.current = true;
    setUpdatingOverlays(true);

    try {
      await api.updatePanelOverlays(projectId, panelIndex, updates);
      toast({
        variant: 'success',
        title: 'Overlays saved',
        description: `Dialogue/captions updated for panel ${panelIndex + 1}.`,
      });
      await refreshSilent();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Overlay update failed',
        description: err instanceof Error ? err.message : 'An error occurred.',
      });
    } finally {
      setUpdatingOverlays(false);
      updatingOverlaysRef.current = false;
    }
  };

  const onUpdateDisplayTitle = async (title: string | null) => {
    if (updatingOverlaysRef.current) return;
    updatingOverlaysRef.current = true;
    setUpdatingOverlays(true);

    try {
      await api.updateDisplayTitle(projectId, title);
      toast({
        variant: 'success',
        title: 'Title updated',
        description: title ? `Set to "${title}".` : 'Title cleared.',
      });
      await refreshSilent();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Title update failed',
        description: err instanceof Error ? err.message : 'An error occurred.',
      });
    } finally {
      setUpdatingOverlays(false);
      updatingOverlaysRef.current = false;
    }
  };

  return {
    onUpdatePanelOverlays,
    onUpdateDisplayTitle,
    updatingOverlays,
  };
}
