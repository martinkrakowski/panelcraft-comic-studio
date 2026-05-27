'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

import { NoSemanticState } from '../../types';

/**
 * Modal dialog system based on Radix UI primitives.
 * Blocks raw data/loading states from leaking into overlay modules.
 *
 * @example
 * <Dialog>
 *   <DialogTrigger>Open Modal</DialogTrigger>
 *   <DialogContent>
 *     <DialogHeader>
 *       <DialogTitle>Confirm Action</DialogTitle>
 *       <DialogDescription>This action cannot be undone.</DialogDescription>
 *     </DialogHeader>
 *     <DialogFooter>
 *       <Button>Confirm</Button>
 *     </DialogFooter>
 *   </DialogContent>
 * </Dialog>
 */
/**
 * Default `modal={false}` to bypass `react-remove-scroll`. Our WorkspaceShell
 * already locks the body via `h-dvh overflow-hidden`, so we don't need Radix
 * to inject its own scroll lock — and doing so triggers a layout-width
 * restoration bug on iOS Safari that leaves the viewport permanently widened
 * after the modal unmounts. Consumers can still pass `modal={true}` to opt in.
 */
const Dialog = ({
  modal = false,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>) => (
  <DialogPrimitive.Root modal={modal} {...props} />
);
Dialog.displayName = 'Dialog';

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

/**
 * Semi-transparent overlay backdrop for the Dialog modal viewport.
 *
 * @component
 * @param props - Component props containing HTML attributes and optional className overrides.
 * @param ref - Forwarded reference to the underlying Radix DialogOverlay primitive.
 * @returns React.Element wrapping the Radix DialogPrimitive.Overlay component.
 */
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  NoSemanticState<
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
  >
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * Main content container for the modal dialog.
 * Embeds viewport-centering animations, borders, shadows, and default close button.
 *
 * @component
 * @param props - Component props containing HTML attributes, className, and child nodes.
 * @param ref - Forwarded reference to the underlying Radix DialogContent primitive.
 * @returns React.Element containing DialogOverlay and the Radix DialogPrimitive.Content portal.
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  NoSemanticState<
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
  >
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-slate-800 bg-slate-900 p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-1/2 data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-1/2 rounded-xl',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground text-slate-400">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

/**
 * Header section container inside the dialog, typically used to group title and description.
 *
 * @component
 * @param props - Component props containing HTML div attributes.
 * @returns React.Element div styled as dialog header.
 */
const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-1.5 text-center sm:text-left',
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

/**
 * Footer container section inside the dialog, used to group action buttons.
 *
 * @component
 * @param props - Component props containing HTML div attributes.
 * @returns React.Element div styled as dialog footer.
 */
const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

/**
 * Title element for the dialog, read aloud by screen readers on modal entry.
 *
 * @component
 * @param props - Component props containing DialogTitle attributes.
 * @param ref - Forwarded reference to the underlying Radix DialogTitle primitive.
 * @returns React.Element heading styled for the dialog title.
 */
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight text-white',
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

/**
 * Subtext description detail for the dialog, read by screen readers on modal entry.
 *
 * @component
 * @param props - Component props containing DialogDescription attributes.
 * @param ref - Forwarded reference to the underlying Radix DialogDescription primitive.
 * @returns React.Element paragraph containing the dialog description subtext.
 */
const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-slate-400', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
