'use client';

import { ConfirmDialog } from '@panelcraft/ui';
import type { LayoutTemplate } from '../../../lib/layout-templates';

interface ExtendPanelsDialogProps {
  /** Target layout with the higher panel count; null = dialog closed. */
  pending: LayoutTemplate | null;
  /** Current panel count, used to label the delta in the title. */
  currentPanelCount: number;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
}

/**
 * Heads the user up before kicking off the extend pipeline. The worker
 * generates the new panels one at a time with HITL pauses, so the user
 * sees and approves each addition.
 */
export function ExtendPanelsDialog({
  pending,
  currentPanelCount,
  onCancel,
  onConfirm,
  busy,
}: ExtendPanelsDialogProps) {
  const delta = pending ? pending.panelCount - currentPanelCount : 0;
  const plural = delta === 1 ? '' : 's';
  return (
    <ConfirmDialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title={`Add ${delta} more panel${plural}?`}
      description={
        <>
          We&apos;ll generate {delta} new panel{plural} that continue your story
          under the{' '}
          <span className="text-slate-200 font-medium">{pending?.name}</span>{' '}
          layout. You&apos;ll review each new panel before it&apos;s committed —
          approve to continue or send back with feedback to regenerate.
        </>
      }
      confirmLabel="Generate new panels"
      busyLabel="Starting…"
      busy={busy}
      confirmClassName="bg-amber-600 hover:bg-amber-500 text-white"
      onConfirm={onConfirm}
    />
  );
}
