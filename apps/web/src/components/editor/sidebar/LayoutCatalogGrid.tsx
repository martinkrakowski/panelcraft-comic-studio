'use client';

import { CollapsibleSection } from '@panelcraft/ui';
import { LayoutCatalogTile } from './LayoutCatalogTile';
import {
  getLayoutsForPanelCount,
  type LayoutTemplate,
} from '../../../lib/layout-templates';
import { PANEL_COUNT_BUCKETS, classifySwap } from './layout-swap';

interface LayoutCatalogGridProps {
  panelCount: number;
  selectedLayoutId?: string | null;
  disabled?: boolean;
  helperText: string;
  onPickLayout: (layout: LayoutTemplate) => void;
}

/**
 * Catalog of all Recommended Layouts, grouped by panel count, with each
 * bucket annotated by how clicking a tile would change the project (add
 * panels, drop panels, or just rearrange). Dispatch back to the parent's
 * `onPickLayout` handler so routing/state lives upstream.
 */
export function LayoutCatalogGrid({
  panelCount,
  selectedLayoutId,
  disabled,
  helperText,
  onPickLayout,
}: LayoutCatalogGridProps) {
  return (
    <CollapsibleSection title="Layout" defaultOpen>
      <p className="text-xs text-slate-400 mb-3">{helperText}</p>
      <div className="space-y-4">
        {PANEL_COUNT_BUCKETS.map((bucket) => {
          const bucketLayouts = getLayoutsForPanelCount(bucket);
          if (bucketLayouts.length === 0) return null;
          return (
            <LayoutCatalogBucket
              key={bucket}
              bucket={bucket}
              currentPanelCount={panelCount}
              layouts={bucketLayouts}
              selectedLayoutId={selectedLayoutId}
              disabled={disabled}
              onPickLayout={onPickLayout}
            />
          );
        })}
      </div>
    </CollapsibleSection>
  );
}

interface LayoutCatalogBucketProps {
  bucket: number;
  currentPanelCount: number;
  layouts: LayoutTemplate[];
  selectedLayoutId?: string | null;
  disabled?: boolean;
  onPickLayout: (layout: LayoutTemplate) => void;
}

function LayoutCatalogBucket({
  bucket,
  currentPanelCount,
  layouts,
  selectedLayoutId,
  disabled,
  onPickLayout,
}: LayoutCatalogBucketProps) {
  const mode = classifySwap(currentPanelCount, bucket);
  const delta = Math.abs(bucket - currentPanelCount);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
          {bucket}-panel layouts
        </p>
        {mode === 'extend' && (
          <span className="text-[10px] text-amber-300/80">
            +{delta} new panel{delta === 1 ? '' : 's'}
          </span>
        )}
        {mode === 'shrink' && (
          <span className="text-[10px] text-rose-300/80">
            drops {delta} panel{delta === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {layouts.map((layout) => (
          <LayoutCatalogTile
            key={layout.id}
            layout={layout}
            isSelected={selectedLayoutId === layout.id}
            disabled={disabled}
            onClick={() => onPickLayout(layout)}
          />
        ))}
      </div>
    </div>
  );
}
