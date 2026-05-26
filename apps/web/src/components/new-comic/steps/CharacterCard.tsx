'use client';

import { Trash2, ImagePlus } from 'lucide-react';
import { Textarea } from '@panelcraft/ui';
import type {
  UseFormRegister,
  FieldErrors,
  FieldArrayWithId,
} from 'react-hook-form';
import type { WizardFormValues } from '../../../lib/validation/wizard-schemas';
import type { WizardPersistedState } from '../../../lib/hooks';

interface CharacterCardProps {
  field: FieldArrayWithId<WizardFormValues, 'characters', 'id'>;
  index: number;
  register: UseFormRegister<WizardFormValues>;
  errors: FieldErrors<WizardFormValues>;
  handleCharacterImageUpload: (index: number, file: File) => Promise<void>;
  saveToIndexedDB: (overrides?: Partial<WizardPersistedState>) => Promise<void>;
  onRemove: (index: number) => void;
}

export function CharacterCard({
  field,
  index,
  register,
  errors,
  handleCharacterImageUpload,
  saveToIndexedDB,
  onRemove,
}: CharacterCardProps) {
  return (
    <div
      key={field.id}
      className="bg-slate-900/30 border border-slate-700 rounded-lg p-4 space-y-3"
    >
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-slate-300 uppercase">
          Character {index + 1}
        </span>
        <button
          type="button"
          aria-label={`Remove character ${index + 1}`}
          onClick={() => onRemove(index)}
          className="text-slate-500 hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={`character-name-${index}`}
            className="text-[10px] text-slate-400 uppercase"
          >
            Name
          </label>
          <input
            id={`character-name-${index}`}
            {...register(`characters.${index}.name`)}
            onBlur={() => saveToIndexedDB()}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white"
          />
          {errors.characters?.[index]?.name && (
            <p className="text-xs text-red-400">
              {errors.characters[index]?.name?.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={`character-role-${index}`}
            className="text-[10px] text-slate-400 uppercase"
          >
            Role
          </label>
          <input
            id={`character-role-${index}`}
            {...register(`characters.${index}.role`)}
            onBlur={() => saveToIndexedDB()}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white"
          />
          {errors.characters?.[index]?.role && (
            <p className="text-xs text-red-400">
              {errors.characters[index]?.role?.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor={`character-visual-${index}`}
          className="text-[10px] text-slate-400 uppercase"
        >
          Visual Description
        </label>
        <Textarea
          id={`character-visual-${index}`}
          {...register(`characters.${index}.visual`)}
          onBlur={() => saveToIndexedDB()}
          placeholder="Mid-40s, sharp jaw, dark trench coat..."
          className="h-20 resize-none bg-slate-800 border border-slate-700 text-white text-sm"
        />
        {errors.characters?.[index]?.visual && (
          <p className="text-xs text-red-400">
            {errors.characters[index]?.visual?.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor={`character-consistency-${index}`}
          className="text-[10px] text-slate-400 uppercase"
        >
          Consistency Notes
        </label>
        <Textarea
          id={`character-consistency-${index}`}
          {...register(`characters.${index}.consistency`)}
          onBlur={() => saveToIndexedDB()}
          placeholder="Always wears red scarf, scar over left eye, never smiles..."
          className="h-20 resize-none bg-slate-800 border border-slate-700 text-white text-sm"
        />
        {errors.characters?.[index]?.consistency && (
          <p className="text-xs text-red-400">
            {errors.characters[index]?.consistency?.message}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="file"
          id={`char-image-${index}`}
          accept="image/*"
          className="hidden"
          onChange={(e) =>
            e.target.files?.[0] &&
            handleCharacterImageUpload(index, e.target.files[0])
          }
        />
        <label
          htmlFor={`char-image-${index}`}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white cursor-pointer"
        >
          <ImagePlus className="h-4 w-4" />
          Upload Reference Image
        </label>
      </div>
    </div>
  );
}
