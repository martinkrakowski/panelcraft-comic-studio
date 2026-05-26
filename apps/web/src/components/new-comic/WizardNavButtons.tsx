'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, ContentPanelFooter } from '@panelcraft/ui';

interface WizardNavButtonsProps {
  activeStep: number;
  /**
   * Single back affordance. The parent decides destination: at step 0 it
   * should exit the wizard (e.g. back to `/new` onboarding), at step > 0
   * it decrements the wizard step.
   */
  onBack: () => void;
  onNext: () => void;
}

/**
 * Pinned footer for wizard step navigation. Renders inside the
 * `<AppCanvasTwoPane footer>` slot. Returns null on terminal steps where
 * navigation no longer applies, so the footer area collapses cleanly.
 *
 * Layout: Back on the left (always shown — contextual destination),
 * Next on the right (hidden on the final step).
 */
export function WizardNavButtons({
  activeStep,
  onBack,
  onNext,
}: WizardNavButtonsProps) {
  if (activeStep >= 4) return null;

  const showNext = activeStep < 3;

  return (
    <ContentPanelFooter>
      <Button
        type="button"
        onClick={onBack}
        className="bg-slate-800 hover:bg-slate-700 text-white inline-flex items-center"
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      {showNext ? (
        <Button
          type="button"
          onClick={onNext}
          className="bg-violet-600 hover:bg-violet-500 text-white"
        >
          Next <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      ) : (
        <span aria-hidden />
      )}
    </ContentPanelFooter>
  );
}
