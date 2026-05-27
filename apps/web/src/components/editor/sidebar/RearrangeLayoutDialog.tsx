'use client';

import { ConfirmDialog } from '@panelcraft/ui';
import type { LayoutTemplate } from '../../../lib/layout-templates';

interface RearrangeLayoutDialogProps {
  /** When non-null, the dialog is open and points at this layout. */
  pending: LayoutTemplate | null;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
}

/**
 * Same-panel-count layout swap. No regeneration happens — just persists
 * the new template ID and the editor re-renders panels into the new grid.
 * Lifted out so the parent section stays focused on routing.
 */
export function RearrangeLayoutDialog({
  pending,
  onCancel,
  onConfirm,
  busy,
}: RearrangeLayoutDialogProps) {
  return (
    <ConfirmDialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title="Switch layout?"
      description={
        <>
          Your existing panels will be rearranged into the{' '}
          <span className="text-slate-200 font-medium">{pending?.name}</span>{' '}
          layout. No panels will be regenerated.
        </>
      }
      confirmLabel="Switch layout"
      busyLabel="Switching…"
      busy={busy}
      confirmClassName="bg-indigo-600 hover:bg-indigo-500 text-white"
      onConfirm={onConfirm}
    />
  );
}
