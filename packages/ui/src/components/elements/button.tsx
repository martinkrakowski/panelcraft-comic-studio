import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

import { NoSemanticState } from '../../types';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm',
        destructive: 'bg-red-600 text-white hover:bg-red-500 shadow-sm',
        outline:
          'border border-slate-700 bg-slate-900/50 text-slate-100 hover:bg-slate-800 hover:text-white backdrop-blur-sm',
        secondary:
          'bg-slate-800 text-slate-100 hover:bg-slate-700 shadow-sm border border-slate-700/50',
        ghost: 'hover:bg-slate-800/80 hover:text-slate-100 text-slate-400',
        link: 'text-indigo-400 underline-offset-4 hover:underline hover:text-indigo-300',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends
    NoSemanticState<React.ButtonHTMLAttributes<HTMLButtonElement>>,
    VariantProps<typeof buttonVariants> {}

/**
 * Button component used for user interactions, supports multiple visual variants and sizes.
 * Extends standard HTML button attributes while forbidding raw semantic states.
 *
 * @example
 * <Button variant="default" size="default">Click Me</Button>
 * <Button variant="outline" size="sm">Outline Button</Button>
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
