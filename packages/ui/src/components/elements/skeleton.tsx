import * as React from "react";
import { cn } from "../../lib/utils";

import { NoSemanticState } from "../../types";

export interface SkeletonProps extends NoSemanticState<React.HTMLAttributes<HTMLDivElement>> {}

/**
 * Skeleton loading placeholder component with pulse animations.
 * Blocks direct semantic state parameters to keep UI strictly presentation-only.
 * 
 * @example
 * <Skeleton className="h-64 w-full rounded-xl" />
 */
function Skeleton({
  className,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-800", className)}
      {...props}
    />
  );
}

export { Skeleton };
