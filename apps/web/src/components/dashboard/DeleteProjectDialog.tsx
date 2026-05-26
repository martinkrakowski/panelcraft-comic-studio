'use client';

import { ConfirmDialog } from '@panelcraft/ui';
import { Trash2 } from 'lucide-react';

interface DeleteProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Project prompt used as context in the confirmation message so the user
   * knows which comic they're about to remove. May be the truncated 50-char
   * summary returned by the list endpoint.
   */
  promptPreview: string;
  onConfirm: () => void | Promise<void>;
  /** Disables both actions while the delete is in flight. */
  deleting?: boolean;
}

/**
 * Destructive confirmation modal. Deleting a project removes its DB row,
 * all storage assets (cover + panel images + mood-board uploads), and the
 * LangGraph checkpoint — no soft-delete or undo. The dialog is the user's
 * last chance to back out, so the destructive action is on the right and
 * styled red.
 */
export function DeleteProjectDialog({
  open,
  onOpenChange,
  promptPreview,
  onConfirm,
  deleting,
}: DeleteProjectDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      contentClassName="max-w-md"
      title="Delete this comic?"
      description={
        <>
          <span className="block mb-2 italic text-slate-300">
            &ldquo;{promptPreview || 'Untitled comic'}&rdquo;
          </span>
          This permanently removes the project, all generated panel images, the
          cover, mood-board uploads, and workflow state. There is no undo.
        </>
      }
      confirmLabel="Delete"
      busyLabel="Deleting…"
      busy={deleting}
      confirmVariant="destructive"
      confirmIcon={<Trash2 className="h-4 w-4" />}
      onConfirm={handleConfirm}
    />
  );
}
