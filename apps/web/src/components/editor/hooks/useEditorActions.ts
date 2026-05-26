'use client';

import type { SubmitReviewFormValues } from '../../../lib/validation/form-schemas';
import type { DialogueEntry, CaptionEntry } from '@panelcraft/types';

import { useLayoutActions } from './useLayoutActions';
import { useRegenerationActions } from './useRegenerationActions';
import { useReviewActions } from './useReviewActions';
import { useOverlayActions } from './useOverlayActions';

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
  onUpdatePanelOverlays: (panelIndex: number, updates: { dialogue?: DialogueEntry[]; captions?: CaptionEntry[] }) => Promise<void>;
  onUpdateDisplayTitle: (title: string | null) => Promise<void>;

  // Loading states
  selectingLayout: boolean;
  regeneratingPanelIndex: number | null;
  submittingReview: boolean;
  updatingOverlays: boolean;
}

/**
 * Composed hook that orchestrates focused action hooks for the ComicEditor.
 * This keeps the public API stable while improving internal decomposition.
 */
export function useEditorActions({
  projectId,
  refreshSilent,
  resetForm,
}: UseEditorActionsArgs): UseEditorActionsReturn {
  const layout = useLayoutActions({ projectId, refreshSilent });
  const regeneration = useRegenerationActions({ projectId, refreshSilent });
  const review = useReviewActions({ projectId, refreshSilent, resetForm });
  const overlays = useOverlayActions({ projectId, refreshSilent });

  return {
    onSelectLayout: layout.onSelectLayout,
    selectingLayout: layout.selectingLayout,

    onRegeneratePanel: regeneration.onRegeneratePanel,
    regeneratingPanelIndex: regeneration.regeneratingPanelIndex,

    onSubmitReview: review.onSubmitReview,
    submittingReview: review.submittingReview,

    onUpdatePanelOverlays: overlays.onUpdatePanelOverlays,
    onUpdateDisplayTitle: overlays.onUpdateDisplayTitle,
    updatingOverlays: overlays.updatingOverlays,
  };
}
