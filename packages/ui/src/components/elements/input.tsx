import * as React from "react";
import { cn } from "../../lib/utils";

import { NoSemanticState } from "../../types";

export interface InputProps
  extends NoSemanticState<React.InputHTMLAttributes<HTMLInputElement>> {}

/**
 * Primitive text input component for form actions.
 * Extends standard input elements while preventing direct semantic state leakage.
 * 
 * @example
 * <Input type="text" placeholder="Enter comic name..." />
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
