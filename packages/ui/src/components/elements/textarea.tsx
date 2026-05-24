import * as React from 'react';
import { cn } from '../../lib/utils';

import { NoSemanticState } from '../../types';

export type TextareaProps = NoSemanticState<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>;

/**
 * Textarea element for multiline form inputs.
 * Blocks semantic state parameters to keep UI strictly presentation-only.
 *
 * @example
 * <Textarea placeholder="Enter prompt description..." />
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
