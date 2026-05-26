'use client';

import { LayoutPreview } from '../../new-comic/LayoutPreview';
import type { LayoutTemplate } from '../../../lib/layout-templates';

interface LayoutCatalogTileProps {
  layout: LayoutTemplate;
  isSelected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * Single layout-pick button used by the sidebar catalog. Renders the
 * template's name + description + preview rects, and shows a "Selected"
 * badge when this tile matches the project's persisted layout. Click
 * routing (rearrange vs. extend vs. shrink) lives upstream so this stays
 * a dumb presenter.
 */
export function LayoutCatalogTile({
  layout,
  isSelected,
  disabled,
  onClick,
}: LayoutCatalogTileProps) {
  return (
    <button
      type="button"
      disabled={disabled || isSelected}
      onClick={onClick}
      className={`w-full flex flex-col gap-2 p-2 rounded border text-left transition-all ${
        isSelected
          ? 'bg-violet-600/30 border-violet-500 ring-1 ring-violet-400/50 cursor-default'
          : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-violet-500/50 disabled:opacity-50 disabled:cursor-not-allowed'
      }`}
    >
      <div>
        <p className="text-xs font-semibold text-white">
          {layout.name}
          {isSelected && (
            <span className="ml-2 text-[10px] uppercase tracking-widest text-violet-300">
              Selected
            </span>
          )}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {layout.description}
        </p>
      </div>
      <LayoutPreview layout={layout} className="w-full h-20" />
    </button>
  );
}
