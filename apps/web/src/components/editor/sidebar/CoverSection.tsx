'use client';

import Image from 'next/image';
import { CollapsibleSection } from '@panelcraft/ui';

interface CoverSectionProps {
  coverImageUrl?: string | null;
}

/**
 * Visual reference card showing the generated cover image (2:3 portrait
 * frame, object-contain so square xAI covers letterbox gracefully).
 * Returns null when no cover URL is available — collapsed by default
 * since the cover is secondary context for HITL review.
 */
export function CoverSection({ coverImageUrl }: CoverSectionProps) {
  if (!coverImageUrl) return null;

  return (
    <CollapsibleSection title="Cover">
      <div className="relative w-full aspect-[2/3] rounded-md overflow-hidden border border-slate-700 bg-slate-900">
        <Image
          src={coverImageUrl}
          alt="Comic cover"
          fill
          sizes="(max-width: 768px) 100vw, 320px"
          className="object-contain"
        />
      </div>
    </CollapsibleSection>
  );
}
