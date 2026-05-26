'use client';

import Image from 'next/image';
import { CollapsibleSection } from '@panelcraft/ui';

export interface SidebarStyleReferences {
  globalStylePrompt?: string;
  moodBoardPreset?: string;
  moodBoardImages?: string[];
  artDirectionNotes?: string;
}

interface StyleSectionProps {
  styleReferences?: SidebarStyleReferences | null;
}

/**
 * Style references the user supplied in wizard step 2: preset name, free-form
 * style prompt, art direction notes, mood board thumbnails. Returns null when
 * no style data exists. Expanded by default — reviewers need this to evaluate
 * whether generated panels match the requested visual direction.
 *
 * `moodBoardImages` is expected to contain signed URLs (the GET project
 * endpoint signs the storage paths server-side).
 */
export function StyleSection({ styleReferences }: StyleSectionProps) {
  if (!styleReferences) return null;
  const {
    globalStylePrompt,
    moodBoardPreset,
    moodBoardImages,
    artDirectionNotes,
  } = styleReferences;
  const hasAny =
    !!globalStylePrompt ||
    !!moodBoardPreset ||
    !!artDirectionNotes ||
    (moodBoardImages && moodBoardImages.length > 0);
  if (!hasAny) return null;

  return (
    <CollapsibleSection title="Style" defaultOpen>
      <div className="space-y-3">
        {moodBoardPreset && (
          <StyleField label="Preset" value={moodBoardPreset} />
        )}
        {globalStylePrompt && (
          <StyleField
            label="Style Prompt"
            value={globalStylePrompt}
            multiline
          />
        )}
        {artDirectionNotes && (
          <StyleField
            label="Art Direction"
            value={artDirectionNotes}
            multiline
          />
        )}
        {moodBoardImages && moodBoardImages.length > 0 && (
          <MoodBoardGrid urls={moodBoardImages} />
        )}
      </div>
    </CollapsibleSection>
  );
}

function StyleField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
        {label}
      </h4>
      <p
        className={
          multiline
            ? 'text-xs text-slate-300 leading-relaxed whitespace-pre-wrap'
            : 'text-xs text-slate-300'
        }
      >
        {value}
      </p>
    </div>
  );
}

function MoodBoardGrid({ urls }: { urls: string[] }) {
  return (
    <div>
      <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
        Mood Board
      </h4>
      <div className="grid grid-cols-3 gap-1.5">
        {urls.map((url, idx) => (
          <div
            key={`${url}-${idx}`}
            className="relative aspect-square rounded overflow-hidden border border-slate-700 bg-slate-900"
          >
            <Image
              src={url}
              alt={`Mood board ${idx + 1}`}
              fill
              sizes="120px"
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
