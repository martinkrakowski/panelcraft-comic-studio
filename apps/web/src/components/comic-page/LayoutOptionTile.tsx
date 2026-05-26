'use client';

import React from 'react';
import {
  inferPanelCountFromLayout,
  resolveComicPageLayout,
} from '../../lib/comic-page-layouts';

interface LayoutOptionTileProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onSelect: (label: string) => void;
}

/**
 * Shared tile UI for layout pickers. The mini grid is built from the same
 * `resolveComicPageLayout()` that `/projects/[id]/view` uses to compose the
 * final page, so the preview is a faithful — not symbolic — representation
 * of what the user will end up with. Used in both the brainstorm wizard
 * (LayoutChooserStep) and the HITL editor sidebar (LayoutChooserSection).
 */
export const LayoutOptionTile = React.memo(function LayoutOptionTile({
  label,
  selected = false,
  disabled = false,
  onSelect,
}: LayoutOptionTileProps) {
  const panelCount = inferPanelCountFromLayout(label, 4);
  const layout = resolveComicPageLayout(label, panelCount);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(label)}
      aria-pressed={selected}
      className={`group w-full text-left rounded-lg border p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        selected
          ? 'bg-violet-500/15 border-violet-500 ring-1 ring-violet-400/50'
          : 'bg-slate-900/30 border-slate-700 hover:border-violet-500 hover:bg-violet-500/5'
      }`}
    >
      <div
        className="grid gap-1 rounded bg-slate-950/60 border border-slate-800 p-2 mb-2 mx-auto"
        style={{
          gridTemplateColumns: layout.columns,
          gridTemplateRows: layout.rows,
          aspectRatio: layout.aspectRatio,
          width: '70%',
        }}
        aria-hidden
      >
        {Array.from({ length: panelCount }).map((_, idx) => (
          <div
            key={idx}
            className={`rounded-sm border ${
              selected
                ? 'bg-violet-500/30 border-violet-400/50'
                : 'bg-slate-800/80 border-slate-700/70 group-hover:bg-violet-500/20 group-hover:border-violet-400/40'
            }`}
            style={
              layout.cellPlacements?.[idx]
                ? { gridArea: layout.cellPlacements[idx] }
                : undefined
            }
          />
        ))}
      </div>
      <p className="text-xs text-slate-300 font-medium text-center line-clamp-2">
        {label}
      </p>
    </button>
  );
});
