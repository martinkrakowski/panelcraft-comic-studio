import React from 'react';
import { UseFormRegister, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Textarea } from '@panelcraft/ui';
import { WizardFormValues } from '../../../lib/validation/wizard-schemas';
import { WizardPersistedState } from '../../../lib/hooks';
import { STYLE_PRESETS } from '../../../lib/wizard-constants';
import styles from '../NewComicWizard.module.css';

export interface StyleReferencesStepProps {
  register: UseFormRegister<WizardFormValues>;
  errors: FieldErrors<WizardFormValues>;
  watchMoodBoardPreset: string;
  setValue: UseFormSetValue<WizardFormValues>;
  handleMoodBoardUpload: (files: FileList) => Promise<void>;
  moodBoardObjectUrls: string[];
  saveToIndexedDB: (overrides?: Partial<WizardPersistedState>) => Promise<void>;
}

export function StyleReferencesStep({
  register,
  errors,
  watchMoodBoardPreset,
  setValue,
  handleMoodBoardUpload,
  moodBoardObjectUrls,
  saveToIndexedDB,
}: StyleReferencesStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className={styles.heroHeading}>Define your style</h1>
        <p className={styles.heroSubheading}>
          Choose a preset and upload mood references
        </p>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">
          Style Preset
        </span>
        <div className="grid grid-cols-3 gap-2">
          {STYLE_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.id}
              onClick={() => {
                setValue('moodBoardPreset', preset.id);
                saveToIndexedDB();
              }}
              className={`p-3 rounded-lg border text-xs font-medium transition-colors ${
                watchMoodBoardPreset === preset.id
                  ? 'border-violet-500 bg-violet-500/10 text-white'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-widest">
          Global Style Prompt
        </label>
        <Textarea
          {...register('globalStylePrompt')}
          onBlur={() => saveToIndexedDB()}
          placeholder="Gritty noir style with high contrast, heavy shadows..."
          className="h-24 resize-none bg-slate-900/30 border-slate-700 text-white"
        />
        {errors.globalStylePrompt && (
          <p className="text-xs text-red-400">
            {errors.globalStylePrompt.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-widest">
          Mood Board Images
        </label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) =>
            e.target.files && handleMoodBoardUpload(e.target.files)
          }
          className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-violet-500 file:text-white hover:file:bg-violet-600"
        />
        {moodBoardObjectUrls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {moodBoardObjectUrls.map((url, i) => (
              <div
                key={i}
                className="w-16 h-16 rounded bg-slate-800 overflow-hidden"
              >
                <img
                  src={url}
                  alt={`Mood ${i}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
