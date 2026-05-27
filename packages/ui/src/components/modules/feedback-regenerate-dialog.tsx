'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from '../elements/button';
import { Textarea } from '../elements/textarea';
import { cn } from '../../lib/utils';

interface FeedbackRegenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Header title for the dialog (e.g. "Regenerate cover"). */
  title: React.ReactNode;
  /** Sub-header description copy. */
  description?: React.ReactNode;
  /** Label rendered above the feedback textarea. */
  feedbackLabel: string;
  /** Placeholder for the feedback textarea. */
  feedbackPlaceholder?: string;
  /** Label on the primary submit button (e.g. "Regenerate cover"). */
  submitLabel: string;
  /** Label shown on the submit button while `submitting` is true. */
  submittingLabel?: string;
  /** Optional icon rendered before the submit label. */
  submitIcon?: React.ReactNode;
  /** Disables both actions while async work is in flight. */
  submitting?: boolean;
  /** Extra classes for the submit button (for brand-color overrides). */
  submitClassName?: string;
  /** Extra classes for DialogContent (e.g. `max-w-xl`). Defaults to `max-w-xl`. */
  contentClassName?: string;
  cancelLabel?: string;
  /**
   * Optional form content rendered *above* the feedback textarea. Use for
   * extra controls like a segmented selector (e.g. composition flavor) that
   * need to live inside the same form lifecycle as the feedback field. The
   * consumer is responsible for storing/resetting any state it introduces
   * here.
   */
  additionalFields?: React.ReactNode;
  /**
   * Called with the trimmed feedback string on submit. The caller decides
   * whether to close the dialog (`onOpenChange(false)`) before, during, or
   * after the work — the primitive does not auto-close.
   */
  onSubmit: (feedback: string) => void | Promise<void>;
}

/**
 * Shared dialog for "regenerate with optional feedback" flows.
 *
 * Common surface used by composition regeneration, cover regeneration,
 * and similar AI re-roll actions. Owns the dialog chrome, a single
 * feedback textarea, and the Cancel / primary-submit buttons. Consumers
 * that need extra form fields (e.g. a composition-style toggle) can
 * inject them via `additionalFields` — those fields will live inside the
 * same `<form>` and re-mount along with the textarea each time the
 * dialog opens (key cycled on `open`).
 *
 * @example
 * <FeedbackRegenerateDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Regenerate cover"
 *   description="Provide optional guidance for the new cover image."
 *   feedbackLabel="Feedback"
 *   submitLabel="Regenerate cover"
 *   submittingLabel="Regenerating…"
 *   submitting={busy}
 *   submitIcon={<RefreshCw className="h-4 w-4" />}
 *   onSubmit={(feedback) => regen(feedback)}
 * />
 */
export function FeedbackRegenerateDialog({
  open,
  onOpenChange,
  title,
  description,
  feedbackLabel,
  feedbackPlaceholder,
  submitLabel,
  submittingLabel,
  submitIcon,
  submitting,
  submitClassName,
  contentClassName,
  cancelLabel = 'Cancel',
  additionalFields,
  onSubmit,
}: FeedbackRegenerateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-xl', contentClassName)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description !== undefined && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        {open && (
          <FeedbackForm
            // Remount the form on every open/close cycle so feedback /
            // additional-field state never carries over between sessions.
            key={String(open)}
            feedbackLabel={feedbackLabel}
            feedbackPlaceholder={feedbackPlaceholder}
            submitLabel={submitLabel}
            submittingLabel={submittingLabel}
            submitIcon={submitIcon}
            submitting={submitting}
            submitClassName={submitClassName}
            cancelLabel={cancelLabel}
            additionalFields={additionalFields}
            onCancel={() => onOpenChange(false)}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface FeedbackFormProps {
  feedbackLabel: string;
  feedbackPlaceholder?: string;
  submitLabel: string;
  submittingLabel?: string;
  submitIcon?: React.ReactNode;
  submitting?: boolean;
  submitClassName?: string;
  cancelLabel: string;
  additionalFields?: React.ReactNode;
  onCancel: () => void;
  onSubmit: (feedback: string) => void | Promise<void>;
}

function FeedbackForm({
  feedbackLabel,
  feedbackPlaceholder,
  submitLabel,
  submittingLabel,
  submitIcon,
  submitting,
  submitClassName,
  cancelLabel,
  additionalFields,
  onCancel,
  onSubmit,
}: FeedbackFormProps) {
  const [feedback, setFeedback] = React.useState('');
  // Stable id so the <label htmlFor> always matches even across multiple
  // dialog instances on the same page.
  const id = React.useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(feedback.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {additionalFields}

      <div className="space-y-1.5">
        <label
          htmlFor={id}
          className="text-xs font-bold text-slate-400 uppercase tracking-wider block"
        >
          {feedbackLabel}
        </label>
        <Textarea
          id={id}
          placeholder={feedbackPlaceholder}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="h-24 text-xs resize-none"
        />
      </div>

      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          {cancelLabel}
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className={cn(
            'inline-flex items-center gap-1.5',
            submitClassName ?? 'bg-indigo-600 hover:bg-indigo-500 text-white'
          )}
        >
          {submitIcon}
          {submitting && submittingLabel ? submittingLabel : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
