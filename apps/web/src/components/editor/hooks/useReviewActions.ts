'use client';

import { useRef, useState } from 'react';
import { useToast } from '@panelcraft/ui';
import api from '../../../lib/api';
import type { SubmitReviewFormValues } from '../../../lib/validation/form-schemas';

interface UseReviewActionsArgs {
  projectId: string;
  refreshSilent: () => Promise<unknown>;
  resetForm?: (values?: Partial<SubmitReviewFormValues>) => void;
}

interface UseReviewActionsReturn {
  onSubmitReview: (data: SubmitReviewFormValues) => Promise<void>;
  submittingReview: boolean;
}

/**
 * Focused hook for HITL review submission actions.
 */
export function useReviewActions({
  projectId,
  refreshSilent,
  resetForm,
}: UseReviewActionsArgs): UseReviewActionsReturn {
  const { toast } = useToast();

  const [submittingReview, setSubmittingReview] = useState(false);
  const submittingReviewRef = useRef(false);

  const onSubmitReview = async (data: SubmitReviewFormValues) => {
    if (submittingReviewRef.current) return;
    submittingReviewRef.current = true;
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
      submittingReviewRef.current = false;
    }
  };

  return {
    onSubmitReview,
    submittingReview,
  };
}
