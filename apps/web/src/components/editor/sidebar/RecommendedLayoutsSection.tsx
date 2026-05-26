'use client';

import { useState } from 'react';
import { LayoutCatalogGrid } from './LayoutCatalogGrid';
import { RearrangeLayoutDialog } from './RearrangeLayoutDialog';
import { ExtendPanelsDialog } from './ExtendPanelsDialog';
import { ShrinkPanelsDialog } from './ShrinkPanelsDialog';
import { classifySwap } from './layout-swap';
import {
  getLayoutById,
  type LayoutTemplate,
} from '../../../lib/layout-templates';
import type { PanelDTO } from '@panelcraft/types';

interface RecommendedLayoutsSectionProps {
  /** Project panel count — used to classify clicks as same/extend/shrink. */
  panelCount: number;
  /** Current panels (drives the shrink dialog's keep-list). */
  panels: PanelDTO[];
  /** Project status — only `completed` projects accept swap actions. */
  status?: string;
  /** Currently persisted layout (template ID; legacy free-form is ignored). */
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

/**
 * Sidebar entry point for the layout swap UX. Owns the "which dialog is
 * open" state and routes clicks to the right confirm flow based on the
 * panel-count delta. The catalog grid, individual tiles, and each
 * confirm dialog are dedicated sibling components so this file stays
 * focused on orchestration.
 *
 * Status gate: extend/shrink both require a `completed` project on the
 * backend; same-count rearrange is technically safe in other states but
 * we still block during in-flight work to avoid races.
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

  // Match the persisted value against the catalog; legacy free-form strings
  // simply leave nothing highlighted, and the user can pick a real template
  // to migrate.
  const currentTemplate = selectedLayout ? getLayoutById(selectedLayout) : null;
  const blockedByStatus = status !== 'completed';

  const routePick = (layout: LayoutTemplate) => {
    if (currentTemplate?.id === layout.id || blockedByStatus) return;
    const mode = classifySwap(panelCount, layout.panelCount);
    if (mode === 'same' && onSwapLayout) setPendingRearrange(layout);
    else if (mode === 'extend' && onExtendPanels) setPendingExtend(layout);
    else if (mode === 'shrink' && onShrinkPanels) setPendingShrink(layout);
  };

  const confirmRearrange = async () => {
    if (!pendingRearrange || !onSwapLayout) return;
    const chosen = pendingRearrange;
    setPendingRearrange(null);
    await onSwapLayout(chosen.id);
  };

  const confirmExtend = async () => {
    if (!pendingExtend || !onExtendPanels) return;
    const chosen = pendingExtend;
    setPendingExtend(null);
    await onExtendPanels(chosen.id, chosen.panelCount);
  };

  const confirmShrink = async (keepIndices: number[]) => {
    if (!pendingShrink || !onShrinkPanels) return;
    const chosen = pendingShrink;
    await onShrinkPanels(chosen.id, keepIndices);
    setPendingShrink(null);
  };

  return (
    <>
      <LayoutCatalogGrid
        panelCount={panelCount}
        selectedLayoutId={currentTemplate?.id ?? null}
        disabled={swapBusy || blockedByStatus}
        helperText={pickHelperText(blockedByStatus, currentTemplate)}
        onPickLayout={routePick}
      />
      <RearrangeLayoutDialog
        pending={pendingRearrange}
        busy={swapBusy}
        onCancel={() => setPendingRearrange(null)}
        onConfirm={confirmRearrange}
      />
      <ExtendPanelsDialog
        pending={pendingExtend}
        currentPanelCount={panelCount}
        busy={swapBusy}
        onCancel={() => setPendingExtend(null)}
        onConfirm={confirmExtend}
      />
      <ShrinkPanelsDialog
        open={pendingShrink !== null}
        onOpenChange={(open) => {
          if (!open) setPendingShrink(null);
        }}
        panels={panels}
        targetLayout={pendingShrink}
        busy={swapBusy}
        onConfirm={confirmShrink}
      />
    </>
  );
}

function pickHelperText(
  blocked: boolean,
  current: LayoutTemplate | null | undefined
): string {
  if (blocked)
    return 'Layout swaps are available once the comic is fully generated.';
  return current
    ? 'Switch layout to rearrange, add, or drop panels.'
    : 'Pick a layout to arrange your panels.';
}
