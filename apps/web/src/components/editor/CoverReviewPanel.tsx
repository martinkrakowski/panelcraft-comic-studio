'use client';

import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Textarea,
} from '@panelcraft/ui';
import {
  CheckCircle,
  RefreshCw,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';

interface CoverReviewPanelProps {
  /** Freshly-regenerated cover URL pending HITL approval. */
  coverImageUrl?: string | null;
  /**
   * Invoked when the user submits a decision. Approval omits feedback;
   * rejection forwards the comment so the next regenerate-cover run
   * applies the user's intent.
   */
  onSubmit: (decision: {
    approved: boolean;
    comment?: string;
  }) => void | Promise<void>;
  submitting: boolean;
}

/**
 * HITL review surface for the `pending_review_cover` gate.
 *
 * Mirrors `FinalReviewPanel` visually so the cover-regen flow feels like
 * the same experience as the AI composition review: a generated artifact
 * on the left, an actions column on the right with Approve / Regenerate
 * buttons and a feedback textarea. There's no before/after comparison
 * because the worker overwrites the cover storage path in place — the
 * UI never has access to the prior cover after a successful regen.
 *
 * Approval lands the project back at `completed` (URL already saved by
 * the worker); rejection re-enqueues `regenerate-cover` with the
 * feedback applied.
 */
export function CoverReviewPanel({
  coverImageUrl,
  onSubmit,
  submitting,
}: CoverReviewPanelProps) {
  const [comment, setComment] = useState('');

  const handleApprove = async () => {
    await onSubmit({ approved: true });
  };
  const handleReject = async () => {
    await onSubmit({
      approved: false,
      comment: comment.trim() || undefined,
    });
  };

  return (
    <Card className="border-amber-500/50 bg-amber-950/10 shadow-lg shadow-amber-500/5 overflow-hidden">
      <div className="h-1 w-full bg-amber-500" />
      <CardHeader className="p-5">
        <div className="flex items-center space-x-2 text-amber-400 mb-1">
          <Sparkles className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Cover Review
          </span>
        </div>
        <CardTitle className="text-lg font-bold text-white">
          Approve the new cover
        </CardTitle>
        <CardDescription className="text-slate-300 mt-1">
          The AI rendered a fresh cover for your comic. Approve to keep it, or
          reject with feedback to regenerate.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            New Cover
          </span>
          <div className="relative aspect-[2/3] rounded-lg border border-slate-800 bg-black overflow-hidden">
            {coverImageUrl ? (
              <ImageWithFallback
                src={coverImageUrl}
                alt="Regenerated comic cover"
                className="absolute inset-0 w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
                <ImageIcon className="h-8 w-8 text-slate-600 animate-pulse" />
                <span>Cover not yet available…</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="cover-review-comment"
              className="text-xs font-bold text-slate-400 uppercase tracking-wider block"
            >
              Feedback (used when regenerating)
            </label>
            <Textarea
              id="cover-review-comment"
              placeholder="What should change about the cover? (e.g. 'closer to character faces', 'darker mood', 'add the title prominently')"
              className="h-24 text-xs resize-none"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              onClick={handleApprove}
              disabled={submitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 inline-flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="h-4 w-4" />
              Approve cover
            </Button>
            <Button
              type="button"
              onClick={handleReject}
              disabled={submitting}
              variant="secondary"
              className="flex-1 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold py-2 inline-flex items-center justify-center gap-1.5"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${submitting ? 'animate-spin' : ''}`}
              />
              Regenerate with feedback
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
