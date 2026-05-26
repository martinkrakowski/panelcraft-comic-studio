'use client';

import { CollapsibleSection } from '@panelcraft/ui';
import { useWatch, type Control, type FieldArrayWithId } from 'react-hook-form';
import type { WizardFormValues } from '../../../lib/validation/wizard-schemas';

interface SidebarStep1Props {
  control: Control<WizardFormValues>;
  fields: FieldArrayWithId<WizardFormValues, 'characters', 'id'>[];
}

export function SidebarStep1({ control, fields }: SidebarStep1Props) {
  const characters = useWatch({ control, name: 'characters' });

  return (
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
  );
}
