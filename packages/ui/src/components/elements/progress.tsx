import * as React from "react";
import { cn } from "../../lib/utils";

import { NoSemanticState } from "../../types";

export interface ProgressProps extends NoSemanticState<React.HTMLAttributes<HTMLDivElement>> {
  value?: number; // 0 to 100
}

/**
 * Progress bar component showing completion status (0 to 100%).
 * Filters out raw semantic data/fetching states to stay presentational.
 * 
 * @example
 * <Progress value={45} />
 */
const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => {
    // Ensure value is bounded between 0 and 100
    const clampedValue = Math.min(100, Math.max(0, value));

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-slate-800",
          className
        )}
        {...props}
      >
        <div
          className="h-full w-full flex-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 ease-in-out"
          style={{ transform: `translateX(-${100 - clampedValue}%)` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
