'use client';

import { useState } from 'react';
import Image from 'next/image';
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
import type { PanelDTO } from '@panelcraft/types';
import { resolveComicPageLayout } from '../../lib/comic-page-layouts';
import { ImageWithFallback } from './ImageWithFallback';
import type { CompositionFlavor } from './sidebar/RegenerateCompositionDialog';

interface FinalReviewPanelProps {
  /** The AI composition URL pending review. */
  composedImageUrl?: string | null;
  /** The approved panel images, in order — used to render the CSS grid preview. */
  panels: PanelDTO[];
  /** Layout template id (or legacy free-form string) that drives the grid. */
  selectedLayout?: string | null;
  /** Total panel count, used for fallback grid sizing. */
  panelCount: number;
  /**
   * Invoked when the user submits a decision. Approval omits feedback /
   * flavor; rejection forwards the comment and the chosen flavor so the
   * regeneration runs with the user's intent applied.
   */
  onSubmit: (decision: {
    approved: boolean;
    comment?: string;
    composeFlavor?: CompositionFlavor;
  }) => void | Promise<void>;
  submitting: boolean;
}

/**
 * HITL review surface for the `pending_review_final` gate.
 *
 * Two-column layout: the AI composition on the left for primary inspection,
 * and a thumbnail of the deterministic CSS-grid composition on the right
 * for side-by-side comparison. Approval lands the project at `completed`;
 * rejection re-enqueues `compose-final-page` with the comment and the
 * selected composition flavor.
 *
 * Implemented as a standalone form (not via the `HITLReviewPanel` react-
 * hook-form wiring) because the review payload is different (no panel
 * index, the whole composition is the artifact) and the per-panel form
 * doesn't carry the flavor field.
 */
export function FinalReviewPanel({
  composedImageUrl,
  panels,
  selectedLayout,
  panelCount,
  onSubmit,
  submitting,
}: FinalReviewPanelProps) {
  const [comment, setComment] = useState('');
  const [flavor, setFlavor] = useState<CompositionFlavor>('composite-true');

  const gridConfig = resolveComicPageLayout(selectedLayout, panelCount);

  const handleApprove = async () => {
    await onSubmit({ approved: true });
  };
  const handleReject = async () => {
    await onSubmit({
      approved: false,
      comment: comment.trim() || undefined,
      composeFlavor: flavor,
    });
  };

  return (
    <Card className="border-amber-500/50 bg-amber-950/10 shadow-lg shadow-amber-500/5 overflow-hidden">
      <div className="h-1 w-full bg-amber-500" />
      <CardHeader className="p-5">
        <div className="flex items-center space-x-2 text-amber-400 mb-1">
          <Sparkles className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Final Composition Review
          </span>
        </div>
        <CardTitle className="text-lg font-bold text-white">
          Approve the AI-composed page
        </CardTitle>
        <CardDescription className="text-slate-300 mt-1">
          The AI rendered your approved panels as a single unified comic page.
          Compare it against the deterministic layout preview on the right —
          approve to finish, or reject with feedback to regenerate.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 pb-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              AI Composition
            </span>
            <div className="relative aspect-[2/3] rounded-lg border border-slate-800 bg-black overflow-hidden">
              {composedImageUrl ? (
                <Image
                  src={composedImageUrl}
                  alt="AI-composed comic page"
                  fill
                  sizes="(max-width: 768px) 100vw, 480px"
                  className="object-contain"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
                  <ImageIcon className="h-8 w-8 text-slate-600 animate-pulse" />
                  <span>Composition not yet available…</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              CSS Grid Preview
            </span>
            <div
              className="rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden"
              style={{ aspectRatio: gridConfig.aspectRatio ?? '2 / 3' }}
            >
              <div
                className="h-full w-full grid gap-1 p-1"
                style={{
                  gridTemplateColumns: gridConfig.columns,
                  gridTemplateRows: gridConfig.rows,
                }}
              >
                {panels.map((panel, idx) => (
                  <div
                    key={panel.id}
                    className="relative rounded-sm overflow-hidden border border-slate-800 bg-slate-900"
                    style={{
                      gridArea: gridConfig.cellPlacements?.[idx],
                    }}
                  >
                    {panel.imageUrl ? (
                      <ImageWithFallback
                        src={panel.imageUrl}
                        alt={`Panel ${idx + 1}`}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-slate-600">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Deterministic preview built from your approved panels and the
              selected layout — used as the baseline the AI composition is
              compared against.
            </p>
          </div>
        </div>

        <FinalReviewActions
          comment={comment}
          onCommentChange={setComment}
          flavor={flavor}
          onFlavorChange={setFlavor}
          onApprove={handleApprove}
          onReject={handleReject}
          submitting={submitting}
        />
      </CardContent>
    </Card>
  );
}

interface FinalReviewActionsProps {
  comment: string;
  onCommentChange: (next: string) => void;
  flavor: CompositionFlavor;
  onFlavorChange: (next: CompositionFlavor) => void;
  onApprove: () => void | Promise<void>;
  onReject: () => void | Promise<void>;
  submitting: boolean;
}

function FinalReviewActions({
  comment,
  onCommentChange,
  flavor,
  onFlavorChange,
  onApprove,
  onReject,
  submitting,
}: FinalReviewActionsProps) {
  return (
    <div className="space-y-3">
      <FlavorSegment
        value={flavor}
        onChange={onFlavorChange}
        disabled={submitting}
      />

      <div className="space-y-1.5">
        <label
          htmlFor="final-review-comment"
          className="text-xs font-bold text-slate-400 uppercase tracking-wider block"
        >
          Feedback (used when regenerating)
        </label>
        <Textarea
          id="final-review-comment"
          placeholder="What should change about the page? (e.g. 'tighten the gutters', 'soften shadows on Panel 2')"
          className="h-20 text-xs resize-none"
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          onClick={onApprove}
          disabled={submitting}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 inline-flex items-center justify-center gap-1.5"
        >
          <CheckCircle className="h-4 w-4" />
          Approve composition
        </Button>
        <Button
          type="button"
          onClick={onReject}
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
  );
}

interface FlavorSegmentProps {
  value: CompositionFlavor;
  onChange: (next: CompositionFlavor) => void;
  disabled?: boolean;
}

function FlavorSegment({ value, onChange, disabled }: FlavorSegmentProps) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
        Composition style
      </span>
      <div
        role="radiogroup"
        aria-label="Composition style"
        className="grid grid-cols-2 gap-2"
      >
        <FlavorChoice
          selected={value === 'composite-true'}
          disabled={disabled}
          onClick={() => onChange('composite-true')}
          title="Verbatim layout"
          description="Preserve approved panels. Harmonize only seams, gutters, and borders."
        />
        <FlavorChoice
          selected={value === 'repaint'}
          disabled={disabled}
          onClick={() => onChange('repaint')}
          title="Re-paint for unity"
          description="Treat panels as references and repaint the page for maximum cohesion."
        />
      </div>
    </div>
  );
}

interface FlavorChoiceProps {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  description: string;
}

function FlavorChoice({
  selected,
  disabled,
  onClick,
  title,
  description,
}: FlavorChoiceProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={`text-left rounded-lg border px-3 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        selected
          ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500'
          : 'border-slate-700 bg-slate-900 hover:border-slate-600'
      }`}
    >
      <div className="text-sm font-semibold text-slate-100">{title}</div>
      <div className="mt-1 text-[11px] leading-snug text-slate-400">
        {description}
      </div>
    </button>
  );
}
