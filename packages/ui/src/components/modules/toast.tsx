'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from '../controllers/useToast';
import { NoSemanticState } from '../../types';

/**
 * Context provider component that wraps the application and exposes Radix Toast context.
 */
const ToastProvider = ToastPrimitive.Provider;

/**
 * The visible viewport container for the active toast notifications queue.
 * Positioned in the top/bottom corners of the screen.
 *
 * @component
 * @param props - Component props containing viewport HTML attributes.
 * @param ref - Forwarded reference to the underlying Radix Viewport element.
 * @returns React.Element viewport container for positioning active toasts.
 */
const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      'fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 md:max-w-[420px]',
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full',
  {
    variants: {
      variant: {
        default: 'border-slate-800 bg-slate-900 text-slate-100',
        destructive:
          'destructive group border-red-500 bg-red-950/40 text-red-300',
        success: 'border-emerald-500 bg-emerald-950/40 text-emerald-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface ToastProps
  extends
    NoSemanticState<React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root>>,
    VariantProps<typeof toastVariants> {}

/**
 * Individual Toast notification card containing the message, action, and close controls.
 *
 * @component
 * @param props - Toast properties including variant and Radix Toast attributes.
 * @param ref - Forwarded reference to the underlying Radix Toast Root element.
 * @returns React.Element visual wrapper for a single toast card.
 */
const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  ToastProps
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitive.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitive.Root.displayName;

/**
 * Action button inside a Toast notification, for interactive actions like Retry or Undo.
 *
 * @component
 * @param props - Action button properties.
 * @param ref - Forwarded reference to the underlying Radix Toast Action element.
 * @returns React.Element action button for the toast notification.
 */
const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Action
    ref={ref}
    className={cn(
      'inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-transparent px-3 text-sm font-medium transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50 text-slate-100',
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitive.Action.displayName;

/**
 * Close button control inside a Toast notification.
 *
 * @component
 * @param props - Close button properties.
 * @param ref - Forwarded reference to the underlying Radix Toast Close element.
 * @returns React.Element close control button with X icon.
 */
const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn(
      'absolute right-2 top-2 rounded-md p-1 text-slate-400 opacity-0 transition-opacity hover:text-slate-100 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100',
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitive.Close>
));
ToastClose.displayName = ToastPrimitive.Close.displayName;

/**
 * Title element for the individual Toast notification.
 *
 * @component
 * @param props - Text content props.
 * @param ref - Forwarded reference to the underlying Radix Toast Title element.
 * @returns React.Element bold title element.
 */
const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title
    ref={ref}
    className={cn('text-sm font-semibold text-white', className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitive.Title.displayName;

/**
 * Subtext description detail for the individual Toast notification message body.
 *
 * @component
 * @param props - Description text props.
 * @param ref - Forwarded reference to the underlying Radix Toast Description element.
 * @returns React.Element message body description container.
 */
const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={cn('text-sm opacity-90 text-slate-300', className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitive.Description.displayName;

export type ToastActionElement = React.ReactElement<typeof ToastAction>;

/**
 * Application-wide Toaster component that subscribes to the useToast state and renders the list of active toasts.
 * Consumes useToast hook and handles rendering mapped toast notifications.
 *
 * @component
 * @returns React.Element rendering all active toast alerts.
 */
function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  Toaster,
};
