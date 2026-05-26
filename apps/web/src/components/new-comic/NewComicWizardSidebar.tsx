import React from 'react';
import { WizardSidebar } from '@panelcraft/ui';
import type {
  Control,
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
  control: Control<WizardFormValues>;
  preferredLayoutId: string | null;
  setPreferredLayoutId: (id: string | null) => void;
  setValue: UseFormSetValue<WizardFormValues>;
  saveToIndexedDB: (overrides?: Partial<WizardPersistedState>) => Promise<void>;
  fields: FieldArrayWithId<WizardFormValues, 'characters', 'id'>[];
}

/**
 * Sidebar pane for the new-comic wizard. Renders the variant-appropriate
 * `SidebarStep{0,1,2}` for steps 0–2 and returns `null` for steps 3+ (the
 * review/submit and layout-chooser steps run full-width with no sidebar).
 *
 * @returns The active sidebar step, or `null` past step 2.
 */
export function NewComicWizardSidebar(props: NewComicWizardSidebarProps) {
  const { activeStep } = props;

  if (activeStep >= 3) return null;

  const {
    control,
    preferredLayoutId,
    setPreferredLayoutId,
    setValue,
    saveToIndexedDB,
    fields,
  } = props;

  return (
    <WizardSidebar variant="flex" className="pt-20">
      {activeStep === 0 && (
        <SidebarStep0
          control={control}
          preferredLayoutId={preferredLayoutId}
          setPreferredLayoutId={setPreferredLayoutId}
          setValue={setValue}
          saveToIndexedDB={saveToIndexedDB}
        />
      )}
      {activeStep === 1 && (
        <SidebarStep1 control={control} fields={fields} />
      )}
      {activeStep === 2 && (
        <SidebarStep2
          control={control}
          setValue={setValue}
          saveToIndexedDB={saveToIndexedDB}
        />
      )}
    </WizardSidebar>
  );
}
