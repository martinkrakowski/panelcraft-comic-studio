import React from 'react';
import { Control, UseFormHandleSubmit, useWatch } from 'react-hook-form';
import { PenSquare, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@panelcraft/ui';
import { WizardFormValues } from '../../../lib/validation/wizard-schemas';
import styles from '../NewComicWizard.module.css';

export interface ReviewSubmitStepProps {
  control: Control<WizardFormValues>;
  setActiveStep: React.Dispatch<React.SetStateAction<number>>;
  isSubmitting: boolean;
  handleSubmit: UseFormHandleSubmit<WizardFormValues>;
  onSubmit: () => Promise<void>;
}

export function ReviewSubmitStep({
  control,
  setActiveStep,
  isSubmitting,
  handleSubmit,
  onSubmit,
}: ReviewSubmitStepProps) {
  // Review only renders on step 3 entry; a single useWatch subscription on the
  // whole form is cheaper than seven separate ones for an end-of-flow summary.
  const values = useWatch({ control }) as Partial<WizardFormValues>;
  const watchPrompt = values.prompt ?? '';
  const watchPanelCount = values.panelCount ?? 0;
  const watchGenres = values.genres ?? [];
  const watchTones = values.tones ?? [];
  const watchCharacters = values.characters ?? [];
  const watchMoodBoardPreset = values.moodBoardPreset ?? '';
  const watchGlobalStylePrompt = values.globalStylePrompt ?? '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className={styles.heroHeading}>Review & Create</h1>
        <p className={styles.heroSubheading}>
          Confirm your settings before generating
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-slate-900/30 border border-slate-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-white">Story</h3>
            <button
              type="button"
              onClick={() => setActiveStep(0)}
              className="text-xs text-violet-400 hover:text-violet-300"
            >
              <PenSquare className="h-3 w-3 inline mr-1" /> Edit
            </button>
          </div>
          <p className="text-xs text-slate-400 line-clamp-2">{watchPrompt}</p>
          <p className="text-[10px] text-slate-500 mt-1">
            {watchPanelCount} panels • {watchGenres?.join(', ')} •{' '}
            {watchTones?.join(', ')}
          </p>
        </div>

        <div className="bg-slate-900/30 border border-slate-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-white">
              Characters ({watchCharacters?.length})
            </h3>
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className="text-xs text-violet-400 hover:text-violet-300"
            >
              <PenSquare className="h-3 w-3 inline mr-1" /> Edit
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {watchCharacters?.map((char, i) => (
              <div
                key={i}
                className="bg-slate-800 px-3 py-1 rounded-full text-xs text-slate-300"
              >
                {char.name || `Character ${i + 1}`}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/30 border border-slate-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-white">Style</h3>
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className="text-xs text-violet-400 hover:text-violet-300"
            >
              <PenSquare className="h-3 w-3 inline mr-1" /> Edit
            </button>
          </div>
          <p className="text-xs text-slate-400">
            {watchMoodBoardPreset || 'None'}
            {watchGlobalStylePrompt
              ? ` • ${watchGlobalStylePrompt.length > 50 ? `${watchGlobalStylePrompt.slice(0, 50)}...` : watchGlobalStylePrompt}`
              : ''}
          </p>
        </div>
      </div>

      <Button
        type="button"
        onClick={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="w-full bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:via-purple-500 hover:to-pink-500 text-white h-12"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Sparkles className="h-4 w-4 mr-2" />
        )}
        Create Comic with Varo
      </Button>
    </div>
  );
}
