'use client';

import { useState } from 'react';
import { CollapsibleSection } from '@panelcraft/ui';

interface LayoutChooserSectionProps {
  layoutOptions?: string[] | null;
  selectingLayout?: boolean;
  selectedLayout?: string | null;
  onSelectLayout?: (layout: string) => void;
}

/**
 * Sidebar block shown only while the project is in `pending_layout` and the
 * AI has produced layout options. Once the user clicks a tile, an optimistic
 * local selection hides the chooser immediately — the 3 s background poll
 * can briefly return stale state where `selectedLayout` is still null, and
 * we don't want the chooser to flicker back into view.
 *
 * Returns null when no chooser should render, so the parent doesn't need a
 * separate visibility guard.
 */
export function LayoutChooserSection({
  layoutOptions,
  selectingLayout,
  selectedLayout,
  onSelectLayout,
}: LayoutChooserSectionProps) {
  const [optimisticSelected, setOptimisticSelected] = useState<string | null>(
    null
  );
  const effectiveSelectedLayout = selectedLayout || optimisticSelected;

  const shouldShow =
    !effectiveSelectedLayout &&
    !!onSelectLayout &&
    !!layoutOptions &&
    layoutOptions.length > 0;

  if (!shouldShow) return null;

  const handleSelect = (layout: string) => {
    setOptimisticSelected(layout);
    onSelectLayout?.(layout);
  };

  return (
    <CollapsibleSection title="Choose a layout" defaultOpen>
      <p className="text-xs text-slate-400 mb-3">
        The AI suggested these layouts based on your story. Pick one to
        continue.
      </p>
      <div className="grid grid-cols-1 gap-2">
        {layoutOptions.map((layout) => (
          <button
            key={layout}
            type="button"
            disabled={selectingLayout}
            onClick={() => handleSelect(layout)}
            className="text-left p-3 rounded-lg border border-slate-700 bg-slate-800 hover:border-violet-500 hover:bg-violet-500/10 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {layout}
          </button>
        ))}
      </div>
    </CollapsibleSection>
  );
}
