'use client';

import Image from 'next/image';
import { CollapsibleSection } from '@panelcraft/ui';
import { Loader2 } from 'lucide-react';
import type { ProjectStatus } from '@panelcraft/types';

interface FinalCompositionSectionProps {
  status: ProjectStatus;
  composedImageUrl?: string | null;
}

/**
 * Sidebar surface for the AI-rendered final composition.
 *
 * Read-only — the Compose / Regenerate CTA lives in the editor's footer
 * bar (more discoverable than the sidebar, which gets pushed below the
 * layout accordion). This section only provides at-a-glance visual
 * confirmation that a composition exists or is being produced; it
 * collapses to nothing when there's no composition yet and the project
 * isn't composing.
 */
export function FinalCompositionSection({
  status,
  composedImageUrl,
}: FinalCompositionSectionProps) {
  const isComposing = status === 'composing';

  // Nothing to show — no composition exists and none is in flight. Hide
  // the whole section so it doesn't take vertical real estate above the
  // user-supplied wizard fields (prompt, characters, style).
  if (!composedImageUrl && !isComposing) return null;

  return (
    <CollapsibleSection title="Final Composition" defaultOpen>
      <div className="space-y-2">
        <div className="relative w-full aspect-[2/3] rounded-md overflow-hidden border border-violet-700/50 bg-slate-900">
          {composedImageUrl ? (
            <Image
              src={composedImageUrl}
              alt="AI-composed comic page"
              fill
              sizes="(max-width: 768px) 100vw, 320px"
              className="object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>
        {isComposing && (
          <p className="text-[11px] text-slate-400 italic">
            Composing your comic page…
          </p>
        )}
      </div>
    </CollapsibleSection>
  );
}
