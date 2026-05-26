import React from 'react';
import {
  UseFormRegister,
  FieldErrors,
  FieldArrayWithId,
} from 'react-hook-form';
import { Plus } from 'lucide-react';
import { Button } from '@panelcraft/ui';
import { CharacterCard } from './CharacterCard';
import { WizardFormValues } from '../../../lib/validation/wizard-schemas';
import { WizardPersistedState } from '../../../lib/hooks';
import styles from '../NewComicWizard.module.css';

export interface CharacterBibleStepProps {
  register: UseFormRegister<WizardFormValues>;
  errors: FieldErrors<WizardFormValues>;
  fields: FieldArrayWithId<WizardFormValues, 'characters', 'id'>[];
  append: (value: WizardFormValues['characters'][number]) => void;
  remove: (index: number) => void;
  handleCharacterImageUpload: (index: number, file: File) => Promise<void>;
  saveToIndexedDB: (overrides?: Partial<WizardPersistedState>) => Promise<void>;
}

export function CharacterBibleStep({
  register,
  errors,
  fields,
  append,
  remove,
  handleCharacterImageUpload,
  saveToIndexedDB,
}: CharacterBibleStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className={styles.heroHeading}>Build your cast</h1>
        <p className={styles.heroSubheading}>
          Add characters with descriptions and reference images
        </p>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <CharacterCard
            key={field.id}
            field={field}
            index={index}
            register={register}
            errors={errors}
            handleCharacterImageUpload={handleCharacterImageUpload}
            saveToIndexedDB={saveToIndexedDB}
            onRemove={(i) => {
              remove(i);
              saveToIndexedDB();
            }}
          />
        ))}
      </div>

      <Button
        type="button"
        onClick={() => {
          append({
            name: '',
            role: '',
            visual: '',
            consistency: '',
          });
          saveToIndexedDB();
        }}
        className="w-full bg-slate-800 hover:bg-slate-700 text-white"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Character
      </Button>
    </div>
  );
}
