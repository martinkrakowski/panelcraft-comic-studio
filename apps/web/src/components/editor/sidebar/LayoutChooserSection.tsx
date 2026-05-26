'use client';

import { useState } from 'react';
import { CollapsibleSection } from '@panelcraft/ui';
import { LayoutOptionTile } from '../../comic-page/LayoutOptionTile';

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
      <div className="grid grid-cols-1 gap-3">
        {layoutOptions.map((layout) => (
          <LayoutOptionTile
            key={layout}
            label={layout}
            disabled={selectingLayout}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </CollapsibleSection>
  );
}
