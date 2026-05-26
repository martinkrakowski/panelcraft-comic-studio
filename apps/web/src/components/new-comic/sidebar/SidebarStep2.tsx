'use client';

import { CollapsibleSection } from '@panelcraft/ui';
import { STYLE_PRESETS } from '../../../lib/wizard-constants';
import { useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import type { WizardFormValues } from '../../../lib/validation/wizard-schemas';
import type { WizardPersistedState } from '../../../lib/hooks';

interface SidebarStep2Props {
  control: Control<WizardFormValues>;
  setValue: UseFormSetValue<WizardFormValues>;
  saveToIndexedDB: (overrides?: Partial<WizardPersistedState>) => Promise<void>;
}

export function SidebarStep2({ control, setValue, saveToIndexedDB }: SidebarStep2Props) {
  const moodBoardPreset = useWatch({ control, name: 'moodBoardPreset' });

  return (
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
  );
}
