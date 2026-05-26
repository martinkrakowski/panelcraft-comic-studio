'use client';

import { useState } from 'react';
import {
  Button,
  CollapsibleSection,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@panelcraft/ui';
import { LayoutPreview } from '../../new-comic/LayoutPreview';
import {
  getLayoutsForPanelCount,
  getLayoutById,
  type LayoutTemplate,
} from '../../../lib/layout-templates';
import { ShrinkPanelsDialog } from './ShrinkPanelsDialog';
import type { PanelDTO } from '@panelcraft/types';

type SwapMode = 'same' | 'extend' | 'shrink';

interface RecommendedLayoutsSectionProps {
  /** Project panel count — used to detect same/extend/shrink intent. */
  panelCount: number;
  /** Current panels (needed to drive the shrink dialog's keep-list). */
  panels: PanelDTO[];
  /** Project status — disables swap UI while jobs are in flight. */
  status?: string;
  /** Currently persisted layout (template ID for new projects, free-form for legacy). */
  selectedLayout?: string | null;
  /** Disables tile interaction while any swap action is in flight. */
  swapBusy?: boolean;
  /** Same-count rearrangement (PATCH /layout). */
  onSwapLayout?: (layoutId: string) => void | Promise<void>;
  /** Higher-count extension (POST /panels/extend). */
  onExtendPanels?: (
    layoutId: string,
    targetPanelCount: number
  ) => void | Promise<void>;
  /** Lower-count shrink (POST /panels/shrink). */
  onShrinkPanels?: (
    layoutId: string,
    keepIndices: number[]
  ) => void | Promise<void>;
}

const PANEL_COUNT_BUCKETS = [1, 2, 3, 4] as const;

function classifySwap(currentCount: number, targetCount: number): SwapMode {
  if (targetCount === currentCount) return 'same';
  return targetCount > currentCount ? 'extend' : 'shrink';
}

/**
 * Sidebar section that always shows the Recommended Layouts catalog,
 * grouped by panel count, with the currently persisted choice highlighted.
 * Clicking a different tile opens one of three dialogs based on the count
 * delta:
 *  - same → rearrange existing panels (no regeneration)
 *  - more → extend pipeline (generates new panels with HITL pauses)
 *  - fewer → shrink dialog (user picks which to keep, others are dropped)
 *
 * The section is disabled while any pipeline is mid-flight so the user
 * can't kick off conflicting swaps.
 */
export function RecommendedLayoutsSection({
  panelCount,
  panels,
  status,
  selectedLayout,
  swapBusy,
  onSwapLayout,
  onExtendPanels,
  onShrinkPanels,
}: RecommendedLayoutsSectionProps) {
  const [pendingRearrange, setPendingRearrange] =
    useState<LayoutTemplate | null>(null);
  const [pendingExtend, setPendingExtend] = useState<LayoutTemplate | null>(
    null
  );
  const [pendingShrink, setPendingShrink] = useState<LayoutTemplate | null>(
    null
  );

  // Resolve current selection via template ID; legacy free-form strings won't
  // match and leave nothing highlighted, which is the right outcome — the
  // user can still pick a catalog template to migrate.
  const currentTemplate = selectedLayout ? getLayoutById(selectedLayout) : null;

  // Block swap UI for any non-settled state. Extend and shrink both require
  // a `completed` project on the backend; same-count rearrange is safe
  // anywhere but we still block during in-flight work to avoid races.
  const blockedByStatus = status !== 'completed';

  const handleTileClick = (layout: LayoutTemplate) => {
    if (currentTemplate?.id === layout.id) return;
    if (blockedByStatus) return;
    const mode = classifySwap(panelCount, layout.panelCount);
    if (mode === 'same') {
      if (!onSwapLayout) return;
      setPendingRearrange(layout);
    } else if (mode === 'extend') {
      if (!onExtendPanels) return;
      setPendingExtend(layout);
    } else {
      if (!onShrinkPanels) return;
      setPendingShrink(layout);
    }
  };

  const handleConfirmRearrange = async () => {
    if (!pendingRearrange || !onSwapLayout) return;
    const chosen = pendingRearrange;
    setPendingRearrange(null);
    await onSwapLayout(chosen.id);
  };

  const handleConfirmExtend = async () => {
    if (!pendingExtend || !onExtendPanels) return;
    const chosen = pendingExtend;
    setPendingExtend(null);
    await onExtendPanels(chosen.id, chosen.panelCount);
  };

  const handleConfirmShrink = async (keepIndices: number[]) => {
    if (!pendingShrink || !onShrinkPanels) return;
    const chosen = pendingShrink;
    await onShrinkPanels(chosen.id, keepIndices);
    setPendingShrink(null);
  };

  const extendDelta = pendingExtend ? pendingExtend.panelCount - panelCount : 0;

  return (
    <>
      <CollapsibleSection title="Layout" defaultOpen>
        <p className="text-xs text-slate-400 mb-3">
          {blockedByStatus
            ? 'Layout swaps are available once the comic is fully generated.'
            : currentTemplate
              ? 'Switch layout to rearrange, add, or drop panels.'
              : 'Pick a layout to arrange your panels.'}
        </p>
        <div className="space-y-4">
          {PANEL_COUNT_BUCKETS.map((bucket) => {
            const bucketLayouts = getLayoutsForPanelCount(bucket);
            if (bucketLayouts.length === 0) return null;
            const bucketMode = classifySwap(panelCount, bucket);
            return (
              <div key={bucket} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                    {bucket}-panel layouts
                  </p>
                  {bucketMode === 'extend' && (
                    <span className="text-[10px] text-amber-300/80">
                      +{bucket - panelCount} new panel
                      {bucket - panelCount === 1 ? '' : 's'}
                    </span>
                  )}
                  {bucketMode === 'shrink' && (
                    <span className="text-[10px] text-rose-300/80">
                      drops {panelCount - bucket} panel
                      {panelCount - bucket === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {bucketLayouts.map((layout) => {
                    const isSelected = currentTemplate?.id === layout.id;
                    return (
                      <button
                        key={layout.id}
                        type="button"
                        disabled={swapBusy || isSelected || blockedByStatus}
                        onClick={() => handleTileClick(layout)}
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
                        <LayoutPreview
                          layout={layout}
                          className="w-full h-20"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* Same-count rearrange confirmation. */}
      <Dialog
        open={pendingRearrange !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRearrange(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch layout?</DialogTitle>
            <DialogDescription>
              Your existing panels will be rearranged into the{' '}
              <span className="text-slate-200 font-medium">
                {pendingRearrange?.name}
              </span>{' '}
              layout. No panels will be regenerated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingRearrange(null)}
              disabled={swapBusy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmRearrange}
              disabled={swapBusy}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {swapBusy ? 'Switching…' : 'Switch layout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend confirmation. Heads the user up that they'll review each
          new panel before the comic returns to completed state. */}
      <Dialog
        open={pendingExtend !== null}
        onOpenChange={(open) => {
          if (!open) setPendingExtend(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add {extendDelta} more panel{extendDelta === 1 ? '' : 's'}?
            </DialogTitle>
            <DialogDescription>
              We&apos;ll generate {extendDelta} new panel
              {extendDelta === 1 ? '' : 's'} that continue your story under the{' '}
              <span className="text-slate-200 font-medium">
                {pendingExtend?.name}
              </span>{' '}
              layout. You&apos;ll review each new panel before it&apos;s
              committed — approve to continue or send back with feedback to
              regenerate.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingExtend(null)}
              disabled={swapBusy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmExtend}
              disabled={swapBusy}
              className="bg-amber-600 hover:bg-amber-500 text-white"
            >
              {swapBusy ? 'Starting…' : 'Generate new panels'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShrinkPanelsDialog
        open={pendingShrink !== null}
        onOpenChange={(open) => {
          if (!open) setPendingShrink(null);
        }}
        panels={panels}
        targetLayout={pendingShrink}
        busy={swapBusy}
        onConfirm={handleConfirmShrink}
      />
    </>
  );
}
