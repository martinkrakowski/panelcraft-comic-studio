'use client';

import { ChevronRight } from 'lucide-react';
import { Button, ContentPanelFooter } from '@panelcraft/ui';

interface WizardNavButtonsProps {
  activeStep: number;
  onBack: () => void;
  onNext: () => void;
}

/**
 * Pinned footer for wizard step navigation. Renders inside the
 * `<AppCanvasTwoPane footer>` slot. Returns null on terminal steps where
 * neither Back nor Next applies, so the footer area collapses cleanly.
 *
 * Layout: Back on the left, Next on the right (platform-standard). Empty
 * spacer keeps the surviving button anchored to its edge when only one of
 * the two is shown.
 */
export function WizardNavButtons({
  activeStep,
  onBack,
  onNext,
}: WizardNavButtonsProps) {
  if (activeStep >= 4) return null;

  const showBack = activeStep > 0;
  const showNext = activeStep < 3;

  if (!showBack && !showNext) return null;

  return (
    <ContentPanelFooter>
      {showBack ? (
        <Button
          type="button"
          onClick={onBack}
          className="bg-slate-800 hover:bg-slate-700 text-white"
        >
          Back
        </Button>
      ) : (
        <span aria-hidden />
      )}
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
