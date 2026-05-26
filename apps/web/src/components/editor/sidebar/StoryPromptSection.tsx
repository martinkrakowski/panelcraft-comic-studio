'use client';

import { CollapsibleSection } from '@panelcraft/ui';

interface StoryPromptSectionProps {
  prompt?: string;
}

/**
 * Full story prompt the user entered in the wizard. Header line-clamps the
 * prompt to one line; this section gives the reviewer the unabridged text
 * (preserves newlines) while approving panels.
 */
export function StoryPromptSection({ prompt }: StoryPromptSectionProps) {
  if (!prompt) return null;

  return (
    <CollapsibleSection title="Story Prompt" defaultOpen>
      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
        {prompt}
      </p>
    </CollapsibleSection>
  );
}
