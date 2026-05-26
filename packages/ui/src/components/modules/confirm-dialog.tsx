'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button, type ButtonProps } from '../elements/button';
import { cn } from '../../lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel: string;
  /** Label shown on the confirm button while `busy` is true. */
  busyLabel?: string;
  cancelLabel?: string;
  /** Disables both actions while async work is in flight. */
  busy?: boolean;
  /** Button variant for the confirm button. Defaults to `default`. */
  confirmVariant?: ButtonProps['variant'];
  /** Extra classes for the confirm button (for brand-color overrides). */
  confirmClassName?: string;
  /** Optional icon rendered before the confirm label. */
  confirmIcon?: React.ReactNode;
  /** Extra classes for DialogContent (e.g. `max-w-md` for narrow modals). */
  contentClassName?: string;
  /**
   * Called when the confirm button is clicked. Caller decides whether to
   * close the dialog (`onOpenChange(false)`) before, during, or after the
   * confirm action — the primitive does not auto-close.
   */
  onConfirm: () => void | Promise<void>;
}

/**
 * Confirm/Cancel dialog primitive. Two buttons in a footer, title +
 * description in a header, no body content. For richer flows (multi-step,
 * forms, image previews) use `Dialog` directly.
 *
 * @example
 * <ConfirmDialog
 *   open={pending !== null}
 *   onOpenChange={(o) => !o && setPending(null)}
 *   title="Delete project?"
 *   description="This cannot be undone."
 *   confirmLabel="Delete"
 *   confirmVariant="destructive"
 *   busy={deleting}
 *   busyLabel="Deleting…"
 *   onConfirm={handleDelete}
 * />
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  busyLabel,
  cancelLabel = 'Cancel',
  busy,
  confirmVariant,
  confirmClassName,
  confirmIcon,
  contentClassName,
  onConfirm,
}: ConfirmDialogProps) {
  const handleCancel = () => onOpenChange(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description !== undefined && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              confirmIcon ? 'inline-flex items-center gap-1.5' : undefined,
              confirmClassName
            )}
          >
            {confirmIcon}
            {busy && busyLabel ? busyLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
