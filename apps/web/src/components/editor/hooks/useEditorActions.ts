'use client';

import { useRef, useState } from 'react';
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
  onSwapLayout: (layout: string) => Promise<void>;
  onExtendPanels: (layout: string, targetPanelCount: number) => Promise<void>;
  onShrinkPanels: (layout: string, keepIndices: number[]) => Promise<void>;
  onRegeneratePanel: (panelIndex: number, feedback?: string) => Promise<void>;
  onSubmitReview: (data: SubmitReviewFormValues) => Promise<void>;
  onComposeFinalPage: (options?: {
    regenFeedback?: string;
    composeFlavor?: 'composite-true' | 'repaint';
  }) => Promise<void>;
  onRegenerateCover: (feedback?: string) => Promise<void>;

  // Loading states
  selectingLayout: boolean;
  swappingLayout: boolean;
  extendingPanels: boolean;
  shrinkingPanels: boolean;
  regeneratingPanelIndex: number | null;
  submittingReview: boolean;
  composingFinalPage: boolean;
  regeneratingCover: boolean;
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
  const [swappingLayout, setSwappingLayout] = useState(false);
  const [extendingPanels, setExtendingPanels] = useState(false);
  const [shrinkingPanels, setShrinkingPanels] = useState(false);
  const [regeneratingPanelIndex, setRegeneratingPanelIndex] = useState<
    number | null
  >(null);
  const [composingFinalPage, setComposingFinalPage] = useState(false);
  const [regeneratingCover, setRegeneratingCover] = useState(false);

  // Refs close the click-burst window before React re-renders the disabled
  // button — the *_State flags drive UI, the refs drive the guard.
  const selectingLayoutRef = useRef(false);
  const swappingLayoutRef = useRef(false);
  const extendingPanelsRef = useRef(false);
  const shrinkingPanelsRef = useRef(false);
  const submittingReviewRef = useRef(false);
  const composingFinalPageRef = useRef(false);
  const regeneratingCoverRef = useRef(false);

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

  /**
   * Swap the persisted layout choice on a post-generation project. Uses the
   * value-only PATCH endpoint so existing panels are preserved and only their
   * arrangement on `/view` changes — no resume job, no regeneration.
   */
  const onSwapLayout = async (layout: string) => {
    if (swappingLayoutRef.current) return;
    swappingLayoutRef.current = true;
    setSwappingLayout(true);
    try {
      await api.updateLayout(projectId, layout);
      toast({
        variant: 'success',
        title: 'Layout updated',
        description: 'Panels will be rearranged into the new layout.',
      });
      await refreshSilent();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Layout update failed',
        description: err instanceof Error ? err.message : 'An error occurred.',
      });
    } finally {
      setSwappingLayout(false);
      swappingLayoutRef.current = false;
    }
  };

  /**
   * Kick off the extend pipeline: add N empty panels for a higher-count
   * layout and let the worker generate them one at a time with HITL pauses.
   * The project status transitions to `extending` immediately so the
   * editor's polling loop picks up the next generation.
   */
  const onExtendPanels = async (layout: string, targetPanelCount: number) => {
    if (extendingPanelsRef.current) return;
    extendingPanelsRef.current = true;
    setExtendingPanels(true);
    try {
      await api.extendPanels(projectId, targetPanelCount, layout);
      toast({
        variant: 'success',
        title: 'Adding panels',
        description:
          "Generating new panels. You'll be prompted to review each one.",
      });
      await refreshSilent();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not add panels',
        description: err instanceof Error ? err.message : 'An error occurred.',
      });
    } finally {
      setExtendingPanels(false);
      extendingPanelsRef.current = false;
    }
  };

  /**
   * Drop unwanted panels under a lower-count layout. Caller supplies the
   * keepIndices in the order they should appear in the new layout.
   * Destructive on the backend — panels not in keepIndices are removed.
   */
  const onShrinkPanels = async (layout: string, keepIndices: number[]) => {
    if (shrinkingPanelsRef.current) return;
    shrinkingPanelsRef.current = true;
    setShrinkingPanels(true);
    try {
      await api.shrinkPanels(projectId, keepIndices, layout);
      toast({
        variant: 'success',
        title: 'Panels updated',
        description: 'Kept panels were rearranged into the new layout.',
      });
      await refreshSilent();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not shrink panels',
        description: err instanceof Error ? err.message : 'An error occurred.',
      });
    } finally {
      setShrinkingPanels(false);
      shrinkingPanelsRef.current = false;
    }
  };

  const onRegeneratePanel = async (panelIndex: number, feedback?: string) => {
    if (regeneratingPanelIndex !== null) return;
    setRegeneratingPanelIndex(panelIndex);
    try {
      await api.regeneratePanel(projectId, panelIndex, feedback);
      toast({
        variant: 'success',
        title: feedback ? 'Regenerating with feedback' : 'Regenerating panel',
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
    if (submittingReviewRef.current) return;
    submittingReviewRef.current = true;
    setSubmittingReview(true);
    try {
      await api.submitReview(projectId, {
        approved: data.approved,
        comment: data.comment || undefined,
        composeFlavor: data.composeFlavor,
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
      submittingReviewRef.current = false;
    }
  };

  /**
   * Trigger the AI final-composition pass. Used both for the initial run
   * (no options) and for regen-with-feedback retries from the dialog. The
   * project transitions to `composing` immediately; polling on
   * `useProject` keeps the UI in sync until `pending_review_final`.
   */
  const onComposeFinalPage = async (options?: {
    regenFeedback?: string;
    composeFlavor?: 'composite-true' | 'repaint';
  }) => {
    if (composingFinalPageRef.current) return;
    composingFinalPageRef.current = true;
    setComposingFinalPage(true);
    try {
      await api.composeFinalPage(projectId, options ?? {});
      toast({
        variant: 'success',
        title: options?.regenFeedback
          ? 'Regenerating composition'
          : 'Composing final page',
        description:
          'The AI is composing your comic page. This usually takes a minute.',
      });
      await refreshSilent();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Composition failed',
        description: err instanceof Error ? err.message : 'An error occurred.',
      });
    } finally {
      setComposingFinalPage(false);
      composingFinalPageRef.current = false;
    }
  };

  /**
   * Trigger a cover re-roll. Status flips to `processing` server-side
   * (mirrors the regenerate-panel path) and the polling loop picks up
   * the new cover URL when the worker completes. Optional `feedback` is
   * appended to the cover prompt for this run only.
   */
  const onRegenerateCover = async (feedback?: string) => {
    if (regeneratingCoverRef.current) return;
    regeneratingCoverRef.current = true;
    setRegeneratingCover(true);
    try {
      await api.regenerateCover(projectId, feedback);
      toast({
        variant: 'success',
        title: feedback
          ? 'Regenerating cover with feedback'
          : 'Regenerating cover',
        description:
          'The AI is rendering a new cover. This usually takes 10–20 seconds.',
      });
      await refreshSilent();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Cover regeneration failed',
        description: err instanceof Error ? err.message : 'An error occurred.',
      });
    } finally {
      setRegeneratingCover(false);
      regeneratingCoverRef.current = false;
    }
  };

  return {
    onSelectLayout,
    onSwapLayout,
    onExtendPanels,
    onShrinkPanels,
    onRegeneratePanel,
    onSubmitReview,
    onComposeFinalPage,
    onRegenerateCover,
    selectingLayout,
    swappingLayout,
    extendingPanels,
    shrinkingPanels,
    regeneratingPanelIndex,
    submittingReview,
    composingFinalPage,
    regeneratingCover,
  };
}
