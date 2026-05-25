'use client';

import { ChevronRight } from 'lucide-react';
import { Button } from '@panelcraft/ui';

interface WizardNavButtonsProps {
  activeStep: number;
  onBack: () => void;
  onNext: () => void;
}

export function WizardNavButtons({
  activeStep,
  onBack,
  onNext,
}: WizardNavButtonsProps) {
  if (activeStep >= 4) return null;

  return (
    <div className="flex-shrink-0 flex gap-3 justify-center px-4 py-6 border-t border-slate-700">
      {activeStep > 0 && (
        <Button
          type="button"
          onClick={onBack}
          className="bg-slate-800 hover:bg-slate-700 text-white"
        >
          Back
        </Button>
      )}
      {activeStep < 3 && (
        <Button
          type="button"
          onClick={onNext}
          className="bg-violet-600 hover:bg-violet-500 text-white"
        >
          Next <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      )}
    </div>
  );
}
