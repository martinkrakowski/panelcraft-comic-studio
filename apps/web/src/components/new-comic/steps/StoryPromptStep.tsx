import React from 'react';
import { UseFormRegister, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button, SelectionChip, Textarea } from '@panelcraft/ui';
import { WizardFormValues } from '../../../lib/validation/wizard-schemas';
import { WizardPersistedState } from '../../../lib/hooks';
import styles from '../NewComicWizard.module.css';

export interface StoryPromptStepProps {
  register: UseFormRegister<WizardFormValues>;
  errors: FieldErrors<WizardFormValues>;
  watchPrompt: string;
  watchGenres: string[];
  watchTones: string[];
  setValue: UseFormSetValue<WizardFormValues>;
  isAnalyzing: boolean;
  handleAnalyzePrompt: () => Promise<void>;
  saveToIndexedDB: (overrides?: Partial<WizardPersistedState>) => Promise<void>;
}

export function StoryPromptStep({
  register,
  errors,
  watchPrompt,
  watchGenres,
  watchTones,
  setValue,
  isAnalyzing,
  handleAnalyzePrompt,
  saveToIndexedDB,
}: StoryPromptStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className={styles.heroHeading}>Tell your story</h1>
        <p className={styles.heroSubheading}>
          Describe your comic concept in detail
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="story-prompt"
          className="text-xs font-semibold text-slate-300 uppercase tracking-widest flex justify-between"
        >
          <span>Story Prompt</span>
          <span className="text-[10px] text-slate-500">
            {watchPrompt?.length || 0}/1000
          </span>
        </label>
        <Textarea
          id="story-prompt"
          aria-describedby={errors.prompt ? 'prompt-error' : undefined}
          {...register('prompt')}
          onBlur={() => saveToIndexedDB()}
          placeholder="A futuristic detective tracking down a rogue AI in a neon-drenched city..."
          className="h-32 resize-none bg-slate-900/30 border-slate-700 text-white"
        />
        {errors.prompt && (
          <p id="prompt-error" className="text-xs text-red-400">
            {errors.prompt.message}
          </p>
        )}
        {(watchGenres?.length > 0 || watchTones?.length > 0) && (
          <div
            className="flex gap-1.5 flex-wrap pt-1"
            role="group"
            aria-label="Active selections"
          >
            {watchGenres.map((g) => (
              <SelectionChip
                key={`genres-${g}`}
                label={g}
                variant="genre"
                onDismiss={() => {
                  setValue(
                    'genres',
                    watchGenres.filter((x) => x !== g)
                  );
                  saveToIndexedDB();
                }}
              />
            ))}
            {watchTones.map((t) => (
              <SelectionChip
                key={`tones-${t}`}
                label={t}
                variant="tone"
                onDismiss={() => {
                  setValue(
                    'tones',
                    watchTones.filter((x) => x !== t)
                  );
                  saveToIndexedDB();
                }}
              />
            ))}
          </div>
        )}
      </div>

      <Button
        type="button"
        onClick={handleAnalyzePrompt}
        disabled={isAnalyzing}
        className="w-full bg-slate-800 hover:bg-slate-700 text-white"
      >
        {isAnalyzing ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Sparkles className="h-4 w-4 mr-2" />
        )}
        Analyze Prompt
      </Button>
    </div>
  );
}
