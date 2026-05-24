import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { NoSemanticState } from '../../types';

const selectionChipVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors gap-1.5 focus-within:ring-2 focus-within:ring-violet-500/50',
  {
    variants: {
      variant: {
        default:
          'bg-slate-700/60 text-slate-200 border-slate-600 hover:bg-slate-700 hover:border-slate-500',
        genre:
          'bg-violet-950/40 text-violet-300 border-violet-800/40 hover:bg-violet-900/40 hover:border-violet-600/50',
        tone: 'bg-purple-950/40 text-purple-300 border-purple-800/40 hover:bg-purple-900/40 hover:border-purple-600/50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface SelectionChipProps
  extends
    NoSemanticState<React.HTMLAttributes<HTMLSpanElement>>,
    VariantProps<typeof selectionChipVariants> {
  label: string;
  onDismiss: () => void;
}

export function SelectionChip({
  className,
  variant,
  label,
  onDismiss,
  ...props
}: SelectionChipProps) {
  return (
    <span
      className={cn(selectionChipVariants({ variant }), className)}
      {...props}
    >
      <span>{label}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="text-slate-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none rounded-full"
        aria-label={`Remove ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
