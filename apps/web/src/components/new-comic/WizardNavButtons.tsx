'use client';

import { ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { Button, ContentPanelFooter } from '@panelcraft/ui';
import { useWatch, type Control } from 'react-hook-form';
import type { WizardFormValues } from '../../lib/validation/wizard-schemas';

interface WizardNavButtonsProps {
  activeStep: number;
  /**
   * Single back affordance. The parent decides destination: at step 0 it
   * should exit the wizard (e.g. back to `/new` onboarding), at step > 0
   * it decrements the wizard step.
   */
  onBack: () => void;
  onNext: () => void;
  /**
   * Form control — used on step 0 to observe the live prompt so we can
   * toggle the primary button between Analyze and Next when the prompt
   * diverges from the last analyzed value.
   */
  control: Control<WizardFormValues>;
  /** Triggers the prompt analyzer; primary action on step 0 before analyze. */
  onAnalyze: () => void;
  isAnalyzing: boolean;
  /**
   * Exact prompt string from the last successful analyze. When the live
   * prompt matches this value, step 0 promotes Next as the primary; any
   * subsequent edit reverts the primary back to Analyze.
   */
  lastAnalyzedPrompt: string | null;
}

/**
 * Pinned footer for wizard step navigation. Renders inside the
 * `<AppCanvasTwoPane footer>` slot. Returns null on terminal steps where
 * navigation no longer applies, so the footer area collapses cleanly.
 *
 * Layout: Back on the left (always shown — contextual destination),
 * primary on the right. On step 0 the primary swaps between Analyze and
 * Next based on whether the live prompt matches the last analyzed prompt.
 */
export function WizardNavButtons({
  activeStep,
  onBack,
  onNext,
  control,
  onAnalyze,
  isAnalyzing,
  lastAnalyzedPrompt,
}: WizardNavButtonsProps) {
  // Always call the hook (Rules of Hooks); the value only matters on step 0.
  const livePrompt = useWatch({ control, name: 'prompt' });

  if (activeStep >= 4) return null;

  const isStep0 = activeStep === 0;
  const promptIsAnalyzed =
    lastAnalyzedPrompt !== null && livePrompt === lastAnalyzedPrompt;
  const showAnalyze = isStep0 && !promptIsAnalyzed;
  const showNext = !isStep0 ? activeStep < 3 : promptIsAnalyzed;

  return (
    <ContentPanelFooter>
      <Button
        type="button"
        onClick={onBack}
        disabled={isAnalyzing}
        className="bg-slate-800 hover:bg-slate-700 text-white inline-flex items-center"
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      {showAnalyze && (
        <Button
          type="button"
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="bg-violet-600 hover:bg-violet-500 text-white"
        >
          {isAnalyzing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Analyze Prompt
        </Button>
      )}
      {showNext && (
        <Button
          type="button"
          onClick={onNext}
          className="bg-violet-600 hover:bg-violet-500 text-white"
        >
          Next <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      )}
      {!showAnalyze && !showNext && <span aria-hidden />}
    </ContentPanelFooter>
  );
}
