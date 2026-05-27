'use client';

import { FeedbackRegenerateDialog } from '@panelcraft/ui';
import { Image as ImageIcon, RefreshCw } from 'lucide-react';
import { ImageWithFallback } from '../ImageWithFallback';

interface RegenerateCoverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Current cover URL shown as a preview at the top of the dialog so
   * the user has a visual anchor for what they're regenerating. Falls
   * back to an empty placeholder when null.
   */
  coverImageUrl?: string | null;
  /**
   * Invoked when the user submits. The trimmed feedback is appended to
   * the cover prompt for this run only (not persisted on the project).
   */
  onRegenerate: (feedback: string) => void | Promise<void>;
  /** Disables the action while a cover regen request is in flight. */
  submitting?: boolean;
}

/**
 * Cover-specific wrapper around the shared `FeedbackRegenerateDialog`.
 *
 * Unlike the composition variant, the cover has no "style flavor" knob
 * (only one image, no panels to harmonize), but it does benefit from a
 * thumbnail of the current cover at the top so the user can see what
 * they're about to re-roll — that thumbnail lives in the dialog's
 * `additionalFields` slot, above the feedback textarea.
 */
export function RegenerateCoverDialog({
  open,
  onOpenChange,
  coverImageUrl,
  onRegenerate,
  submitting,
}: RegenerateCoverDialogProps) {
  return (
    <FeedbackRegenerateDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Regenerate cover"
      description="The AI will render a new cover for your comic. Optionally provide guidance — your notes apply to this run only."
      feedbackLabel="Optional guidance for this cover"
      feedbackPlaceholder="Anything to emphasize? (e.g. 'wide cinematic shot', 'closer to character faces', leave blank to re-roll the same prompt)"
      submitLabel="Regenerate cover"
      submittingLabel="Regenerating…"
      submitIcon={
        <RefreshCw className={`h-4 w-4 ${submitting ? 'animate-spin' : ''}`} />
      }
      submitting={submitting}
      additionalFields={<CoverPreview src={coverImageUrl} />}
      onSubmit={onRegenerate}
    />
  );
}

/**
 * Read-only thumbnail of the current cover. Constrained to a small
 * portrait frame centered in the dialog body so the preview anchors the
 * action without dominating the modal. Falls back to a placeholder card
 * when no cover exists yet (shouldn't happen in practice — the parent
 * only opens the dialog from completed projects that have a cover —
 * but defensive against future call sites).
 */
function CoverPreview({ src }: { src?: string | null }) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
        Current cover
      </span>
      <div className="flex justify-center">
        <div className="relative w-40 aspect-[2/3] rounded-md overflow-hidden border border-slate-700 bg-slate-950">
          {src ? (
            <ImageWithFallback
              src={src}
              alt="Current comic cover"
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 text-xs gap-1">
              <ImageIcon className="h-6 w-6" />
              <span>No cover yet</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
