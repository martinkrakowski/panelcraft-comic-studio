'use client';

import { useState } from 'react';
import { useToast } from '@panelcraft/ui';
import api from '../../../lib/api';
import type { SubmitReviewFormValues } from '../../../lib/validation/form-schemas';

interface UseEditorActionsArgs {
  projectId: string;
  refreshSilent: () => Promise<unknown>;
  /** Optional reset function for the review form (called on successful submit) */
  resetForm?: (values?: Partial<SubmitReviewFormValues>) => void;
}

interface UseEditorActionsReturn {
  // Handlers
  onSelectLayout: (layout: string) => Promise<void>;
  onRegeneratePanel: (panelIndex: number) => Promise<void>;
  onSubmitReview: (data: SubmitReviewFormValues) => Promise<void>;

  // Loading states
  selectingLayout: boolean;
  regeneratingPanelIndex: number | null;
  submittingReview: boolean;
}

/**
 * Hook that encapsulates all action handlers and their associated loading states
 * for the ComicEditor. This keeps the main component focused on rendering and orchestration.
 */
export function useEditorActions({
  projectId,
  refreshSilent,
  resetForm,
}: UseEditorActionsArgs): UseEditorActionsReturn {
  const { toast } = useToast();

  const [submittingReview, setSubmittingReview] = useState(false);
  const [selectingLayout, setSelectingLayout] = useState(false);
  const [regeneratingPanelIndex, setRegeneratingPanelIndex] = useState<
    number | null
  >(null);

  const onSelectLayout = async (layout: string) => {
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
    }
  };

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

  const onSubmitReview = async (data: SubmitReviewFormValues) => {
    setSubmittingReview(true);
    try {
      await api.submitReview(projectId, {
        approved: data.approved,
        comment: data.comment || undefined,
      });
      toast({
        variant: 'success',
        title: data.approved ? 'Panel Approved!' : 'Regeneration Queued',
        description: data.approved
          ? 'Continuing comic generation workflow in the background.'
          : 'Regenerating the current panel with your feedback comments.',
      });
      resetForm?.({ approved: true, comment: '' });
      await refreshSilent();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Review submission failed',
        description: err instanceof Error ? err.message : 'An error occurred.',
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  return {
    onSelectLayout,
    onRegeneratePanel,
    onSubmitReview,
    selectingLayout,
    regeneratingPanelIndex,
    submittingReview,
  };
}
