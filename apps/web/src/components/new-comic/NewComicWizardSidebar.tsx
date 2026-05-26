import React from 'react';
import { WizardSidebar } from '@panelcraft/ui';
import type {
  UseFormRegister,
  UseFormSetValue,
  FieldArrayWithId,
} from 'react-hook-form';
import type { WizardFormValues } from '../../lib/validation/wizard-schemas';
import type { WizardPersistedState } from '../../lib/hooks';
import { SidebarStep0 } from './sidebar/SidebarStep0';
import { SidebarStep1 } from './sidebar/SidebarStep1';
import { SidebarStep2 } from './sidebar/SidebarStep2';

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

export function NewComicWizardSidebar(props: NewComicWizardSidebarProps) {
  const { activeStep } = props;

  if (activeStep >= 3) return null;

  const {
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
  } = props;

  return (
    <WizardSidebar variant="flex" className="pt-20">
      {activeStep === 0 && (
        <SidebarStep0
          genres={genres}
          tones={tones}
          panelCount={panelCount}
          preferredLayoutId={preferredLayoutId}
          setPreferredLayoutId={setPreferredLayoutId}
          setValue={setValue}
          saveToIndexedDB={saveToIndexedDB}
        />
      )}
      {activeStep === 1 && (
        <SidebarStep1 fields={fields} characters={characters} />
      )}
      {activeStep === 2 && (
        <SidebarStep2
          moodBoardPreset={moodBoardPreset}
          setValue={setValue}
          saveToIndexedDB={saveToIndexedDB}
        />
      )}
    </WizardSidebar>
  );
}
