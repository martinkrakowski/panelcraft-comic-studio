'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@panelcraft/ui';
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete this comic?</DialogTitle>
          <DialogDescription>
            <span className="block mb-2 italic text-slate-300">
              &ldquo;{promptPreview || 'Untitled comic'}&rdquo;
            </span>
            This permanently removes the project, all generated panel images,
            the cover, mood-board uploads, and workflow state. There is no undo.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
