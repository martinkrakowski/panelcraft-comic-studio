'use client';

import { Trash2 } from 'lucide-react';

interface CharacterCardProps {
  field: any;
  index: number;
  register: any;
  errors: any;
  handleCharacterImageUpload: (index: number, file: File) => void;
  saveToIndexedDB: () => void;
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
        </div>
      </div>

      {/* Visual description and traits would go here - truncated for brevity in this initial extraction */}
      <div>
        <label className="text-[10px] text-slate-400 uppercase">Visual Description</label>
        <textarea
          {...register(`characters.${index}.visualDescription`)}
          onBlur={() => saveToIndexedDB()}
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white h-20"
        />
      </div>

      {/* Image upload placeholder */}
      <div>
        <button
          type="button"
          onClick={() => {
            // In real implementation, trigger file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e: any) => {
              const file = e.target.files?.[0];
              if (file) handleCharacterImageUpload(index, file);
            };
            input.click();
          }}
          className="text-xs px-3 py-1 border border-dashed border-slate-600 rounded hover:bg-slate-800"
        >
          Upload Reference Image
        </button>
      </div>
    </div>
  );
}
