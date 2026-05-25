import React from 'react';
import {
  UseFormRegister,
  UseFormSetValue,
  FieldArrayWithId,
} from 'react-hook-form';
import { WizardSidebar, CollapsibleSection } from '@panelcraft/ui';
import { WizardFormValues } from '../../lib/validation/wizard-schemas';
import { WizardPersistedState } from '../../lib/hooks';
import {
  GENRE_OPTIONS,
  TONE_OPTIONS,
  STYLE_PRESETS,
} from '../../lib/wizard-constants';
import { getLayoutsByMood } from '../../lib/layout-templates';
import { LayoutPreview } from './LayoutPreview';

export interface NewComicWizardSidebarProps {
  activeStep: number;
  genres: string[];
  tones: string[];
  panelCount: number;
  preferredLayoutId: string | null;
  setPreferredLayoutId: (id: string | null) => void;
  setValue: UseFormSetValue<WizardFormValues>;
  saveToIndexedDB: (overrides?: Partial<WizardPersistedState>) => Promise<void>;
  register: UseFormRegister<WizardFormValues>;
  fields: FieldArrayWithId<WizardFormValues, 'characters', 'id'>[];
  characters: WizardFormValues['characters'];
  moodBoardPreset: string;
}

export function NewComicWizardSidebar({
  activeStep,
  genres,
  tones,
  panelCount,
  preferredLayoutId,
  setPreferredLayoutId,
  setValue,
  saveToIndexedDB,
  register,
  fields,
  characters,
  moodBoardPreset,
}: NewComicWizardSidebarProps) {
  if (activeStep >= 3) return null;

  return (
    <WizardSidebar variant="flex" className="pt-20">
      {/* Step 0: Genres, Tones, Panel Count, Layouts */}
      {activeStep === 0 && (
        <>
          <CollapsibleSection title="Genres" defaultOpen>
            <div className="flex flex-wrap gap-2">
              {GENRE_OPTIONS.map((genre) => (
                <button
                  type="button"
                  key={genre}
                  aria-pressed={genres?.includes(genre)}
                  onClick={() => {
                    const current = genres || [];
                    const next = current.includes(genre)
                      ? current.filter((g) => g !== genre)
                      : [...current, genre].slice(0, 3);
                    setValue('genres', next);
                    saveToIndexedDB();
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    genres?.includes(genre)
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Tones">
            <div className="flex flex-wrap gap-2">
              {TONE_OPTIONS.map((tone) => (
                <button
                  type="button"
                  key={tone}
                  onClick={() => {
                    const current = tones || [];
                    const next = current.includes(tone)
                      ? current.filter((t) => t !== tone)
                      : [...current, tone].slice(0, 3);
                    setValue('tones', next);
                    saveToIndexedDB();
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    tones?.includes(tone)
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Panel Count">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-300">
                  {panelCount} panel{panelCount !== 1 ? 's' : ''}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={4}
                {...register('panelCount', { valueAsNumber: true })}
                onChange={() => saveToIndexedDB()}
                className="w-full accent-violet-500"
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Recommended Layouts">
            <div className="space-y-3">
              {getLayoutsByMood(panelCount as 1 | 2 | 3 | 4, genres, tones).map(
                (layout) => (
                  <button
                    key={layout.id}
                    type="button"
                    onClick={() => {
                      setPreferredLayoutId(layout.id);
                      saveToIndexedDB({ preferredLayoutId: layout.id });
                    }}
                    className={`w-full flex flex-col gap-2 p-2 rounded border text-left transition-all ${
                      preferredLayoutId === layout.id
                        ? 'bg-violet-600/30 border-violet-500 ring-1 ring-violet-400/50'
                        : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-violet-500/50'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {layout.name}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {layout.description}
                      </p>
                    </div>
                    <LayoutPreview layout={layout} className="w-full h-24" />
                  </button>
                )
              )}
            </div>
          </CollapsibleSection>
        </>
      )}

      {/* Step 1: Character summary */}
      {activeStep === 1 && (
        <CollapsibleSection title="Characters" defaultOpen>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {fields.length === 0 ? (
              <p className="text-xs text-slate-400">No characters added yet</p>
            ) : (
              fields.map((field, i) => (
                <div
                  key={field.id}
                  className="p-2 bg-slate-800/50 rounded border border-slate-700"
                >
                  <p className="text-xs font-semibold text-white">
                    {characters?.[i]?.name || `Character ${i + 1}`}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {characters?.[i]?.role || 'No role set'}
                  </p>
                </div>
              ))
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Step 2: Style Preset */}
      {activeStep === 2 && (
        <CollapsibleSection title="Style Preset" defaultOpen>
          <div className="grid grid-cols-2 gap-2">
            {STYLE_PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.id}
                onClick={() => {
                  setValue('moodBoardPreset', preset.id);
                  saveToIndexedDB();
                }}
                className={`p-2 rounded border text-xs font-medium transition-colors ${
                  moodBoardPreset === preset.id
                    ? 'border-violet-500 bg-violet-500/10 text-white'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </WizardSidebar>
  );
}
