'use client';

import { Check, X } from 'lucide-react';

interface ProjectStatusStripProps {
  status: string;
  completedPanelCount: number;
  panelCount: number;
}

const STATUS_STEPS = ['Created', 'Processing', 'Review', 'Completed'] as const;

function getActiveStep(status: string): number {
  switch (status) {
    case 'created':
      return 0;
    case 'processing':
    case 'pending_creation':
    case 'pending_layout':
    case 'extending':
      return 1;
    case 'pending_review':
    case 'pending_review_extend':
      return 2;
    case 'completed':
      return 3;
    case 'failed':
      // Preserve visual progress at the terminal step; the ProjectStatusBadge
      // (and any error messaging) will communicate the failure state.
      return 3;
    default:
      return 0;
  }
}

/**
 * Lifecycle progress strip for the HITL editor view.
 * Renders a 4-step visual indicator (Created → Processing → Review → Completed)
 * using the same circle/check + connector aesthetic as WizardStepIndicator.
 * Appends a compact "X / N panels" pill on the right.
 *
 * Special states:
 * - `failed` status renders the terminal step with a red background + X icon
 *   (instead of the success check) while still advancing visual progress.
 *
 * Accessibility:
 * - Steps are exposed as an ordered list (`role="list"`) with `role="listitem"`.
 * - `aria-current="step"` is set only on the active non-terminal step.
 * - Decorative connectors are hidden from assistive tech (`aria-hidden`).
 * - The panel count pill has a descriptive `aria-label` ("Project failed; X of Y panels completed" when failed).
 */
export function ProjectStatusStrip({
  status,
  completedPanelCount,
  panelCount,
}: ProjectStatusStripProps) {
  const activeStep = getActiveStep(status);

  return (
    <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-slate-900/30">
      <ol
        role="list"
        aria-label="Project workflow progress"
        className="flex items-center gap-2 flex-wrap"
      >
        {STATUS_STEPS.map((label, i) => {
          const isCurrent = i === activeStep;
          const isTerminal = i === STATUS_STEPS.length - 1;
          const isComplete =
            i < activeStep ||
            (isTerminal && activeStep === STATUS_STEPS.length - 1);
          const isFailedTerminal = status === 'failed' && isTerminal;

          return (
            <li
              key={label}
              role="listitem"
              aria-current={isCurrent && !isComplete ? 'step' : undefined}
              className="flex items-center gap-2"
            >
              <div
                className={`flex items-center gap-1.5 ${
                  isCurrent ? 'text-white' : 'text-slate-500'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    isFailedTerminal
                      ? 'bg-red-600 text-white'
                      : isComplete
                        ? 'bg-violet-600 text-white'
                        : isCurrent
                          ? 'bg-violet-500/20 border border-violet-500 text-violet-300'
                          : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isFailedTerminal ? (
                    <X className="h-3.5 w-3.5" />
                  ) : isComplete ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span className="text-[10px] uppercase tracking-widest hidden sm:block">
                  {label}
                </span>
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className={`w-6 h-0.5 ${
                    isComplete ? 'bg-violet-500' : 'bg-slate-700'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Panel counter pill (replaces the pulsing "AI generating..." indicator) */}
      <div
        className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700"
        aria-label={
          status === 'failed'
            ? `Project failed; ${completedPanelCount} of ${panelCount} panels completed`
            : `${completedPanelCount} of ${panelCount} panels completed`
        }
      >
        {completedPanelCount} / {panelCount}
      </div>
    </div>
  );
}
