'use client';

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@panelcraft/ui';
import { ImageWithFallback } from '../ImageWithFallback';
import { LayoutPreview } from '../../new-comic/LayoutPreview';
import type { LayoutTemplate } from '../../../lib/layout-templates';
import type { PanelDTO } from '@panelcraft/types';

interface ShrinkPanelsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panels: PanelDTO[];
  /** Target layout with the lower panel count. */
  targetLayout: LayoutTemplate | null;
  /** Whether the API call is in flight (disables Confirm). */
  busy?: boolean;
  /**
   * Called with the chosen indices (in user-selected order) when the user
   * commits the shrink. Caller is responsible for calling the API and
   * closing the dialog.
   */
  onConfirm: (keepIndices: number[]) => void | Promise<void>;
}

/**
 * Modal that lets the user choose exactly N existing panels to keep when
 * switching to a layout with fewer cells (e.g. 4 → 2). The dialog enforces
 * the required count via the Confirm button and surfaces the chosen layout's
 * preview so the user sees where each kept panel will land.
 *
 * Click order matters: the first panel they click becomes panel 1 in the new
 * layout, the second becomes panel 2, etc. A "Clear" button lets them reset
 * and re-pick if they misclicked.
 *
 * Selection state lives on `ShrinkForm` and is keyed by the target layout's
 * id (or `'closed'` when the dialog is hidden), so React remounts the form
 * and discards stale picks any time the user opens it under a new layout.
 * No effects required — the remount drives the reset.
 */
export function ShrinkPanelsDialog({
  open,
  onOpenChange,
  panels,
  targetLayout,
  busy,
  onConfirm,
}: ShrinkPanelsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        {targetLayout && open && (
          <ShrinkForm
            key={`${targetLayout.id}-${open}`}
            panels={panels}
            targetLayout={targetLayout}
            busy={busy}
            onCancel={() => onOpenChange(false)}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ShrinkFormProps {
  panels: PanelDTO[];
  targetLayout: LayoutTemplate;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (keepIndices: number[]) => void | Promise<void>;
}

function ShrinkForm({
  panels,
  targetLayout,
  busy,
  onCancel,
  onConfirm,
}: ShrinkFormProps) {
  const target = targetLayout.panelCount;
  const [selected, setSelected] = useState<number[]>([]);

  const togglePanel = (idx: number) => {
    setSelected((prev) => {
      const existingPos = prev.indexOf(idx);
      if (existingPos !== -1) {
        return prev.filter((i) => i !== idx);
      }
      if (prev.length >= target) return prev;
      return [...prev, idx];
    });
  };

  const handleConfirm = async () => {
    if (selected.length !== target) return;
    await onConfirm(selected);
  };

  const remaining = target - selected.length;

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          Switch to {targetLayout.name} — pick {target} panel
          {target === 1 ? '' : 's'} to keep
        </DialogTitle>
        <DialogDescription>
          {targetLayout.description}. The panels you keep will be placed in the
          new layout in the order you click them. Unselected panels are
          permanently removed.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-start">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {panels.map((panel) => {
            const pickedPosition = selected.indexOf(panel.index);
            const isSelected = pickedPosition !== -1;
            return (
              <button
                key={panel.id}
                type="button"
                onClick={() => togglePanel(panel.index)}
                aria-pressed={isSelected}
                className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${
                  isSelected
                    ? 'border-violet-500 ring-2 ring-violet-400/50'
                    : 'border-slate-700 hover:border-violet-500/50'
                }`}
              >
                {panel.imageUrl ? (
                  <ImageWithFallback
                    src={panel.imageUrl}
                    alt={`Panel ${panel.index + 1}`}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-xs text-slate-500">
                    No image
                  </div>
                )}
                <div className="absolute top-1 left-1 bg-slate-950/80 text-slate-200 text-[10px] font-mono px-1.5 py-0.5 rounded">
                  #{panel.index + 1}
                </div>
                {isSelected && (
                  <div className="absolute top-1 right-1 bg-violet-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {pickedPosition + 1}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="space-y-2 text-center min-w-[140px]">
          <p className="text-xs uppercase tracking-widest text-slate-400">
            Target layout
          </p>
          <LayoutPreview layout={targetLayout} className="w-32 h-32 mx-auto" />
          <p className="text-xs text-slate-400">
            {remaining > 0 ? `Pick ${remaining} more` : 'Ready to confirm'}
          </p>
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setSelected([])}
          disabled={busy || selected.length === 0}
        >
          Clear selection
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={busy || selected.length !== target}
          className="bg-rose-600 hover:bg-rose-500 text-white"
        >
          {busy
            ? 'Applying…'
            : `Keep ${target} panel${target === 1 ? '' : 's'}`}
        </Button>
      </DialogFooter>
    </>
  );
}
