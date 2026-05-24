import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-slate-100',
  {
    variants: {
      variant: {
        default: 'bg-slate-900 text-slate-100 border-slate-800',
        destructive:
          'border-red-500/50 bg-red-950/20 text-red-400 [&>svg]:text-red-400',
        warning:
          'border-amber-500/50 bg-amber-950/20 text-amber-400 [&>svg]:text-amber-400',
        info: 'border-indigo-500/50 bg-indigo-950/20 text-indigo-400 [&>svg]:text-indigo-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

import { NoSemanticState } from '../../types';

export interface AlertProps
  extends
    NoSemanticState<React.HTMLAttributes<HTMLDivElement>>,
    VariantProps<typeof alertVariants> {}

/**
 * Message banner block for visual feedback and warning alerts.
 * Blocks direct semantic state parameters to keep UI strictly presentation-only.
 *
 * @example
 * <Alert variant="warning">
 *   <AlertTitle>Warning</AlertTitle>
 *   <AlertDescription>Review is pending.</AlertDescription>
 * </Alert>
 */
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
);
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      'mb-1 font-medium leading-none tracking-tight text-white',
      className
    )}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm opacity-90 [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
