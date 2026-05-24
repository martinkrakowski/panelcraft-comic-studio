import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-indigo-600/20 text-indigo-400 border-indigo-500/30',
        secondary:
          'border-transparent bg-slate-800 text-slate-300 border-slate-700/50',
        destructive:
          'border-transparent bg-red-950/40 text-red-400 border-red-500/30',
        outline: 'text-slate-300 border-slate-700 bg-transparent',
        success:
          'border-transparent bg-emerald-950/40 text-emerald-400 border-emerald-500/30',
        warning:
          'border-transparent bg-amber-950/40 text-amber-400 border-amber-500/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

import { NoSemanticState } from '../../types';

export interface BadgeProps
  extends
    NoSemanticState<React.HTMLAttributes<HTMLDivElement>>,
    VariantProps<typeof badgeVariants> {}

/**
 * Status indicator badge component.
 * Filters out raw semantic state parameters to keep UI strictly presentation-only.
 *
 * @example
 * <Badge variant="success">Completed</Badge>
 * <Badge variant="warning">Pending Review</Badge>
 */
function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
