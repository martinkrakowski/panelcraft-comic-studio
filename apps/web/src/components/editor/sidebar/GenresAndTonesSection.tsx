'use client';

import { CollapsibleSection, Badge } from '@panelcraft/ui';

interface GenresAndTonesSectionProps {
  genres?: string[];
  tones?: string[];
}

/**
 * Chip display of the genre and tone tags the user picked in wizard step 0.
 * Returns null when both arrays are empty — collapsed by default since these
 * are secondary classification metadata.
 */
export function GenresAndTonesSection({
  genres,
  tones,
}: GenresAndTonesSectionProps) {
  const hasGenres = !!genres && genres.length > 0;
  const hasTones = !!tones && tones.length > 0;
  if (!hasGenres && !hasTones) return null;

  return (
    <CollapsibleSection title="Genres & Tones">
      {hasGenres && (
        <div className="mb-3">
          <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
            Genres
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {genres!.map((g) => (
              <Badge
                key={g}
                variant="outline"
                className="text-[10px] py-0 px-1.5 border-indigo-500/40 text-indigo-200"
              >
                {g}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {hasTones && (
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
            Tones
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {tones!.map((t) => (
              <Badge
                key={t}
                variant="outline"
                className="text-[10px] py-0 px-1.5 border-violet-500/40 text-violet-200"
              >
                {t}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}
