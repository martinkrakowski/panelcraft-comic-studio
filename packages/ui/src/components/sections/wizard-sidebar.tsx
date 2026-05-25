'use client';

import React from 'react';
import { Sidebar } from './sidebar';

interface WizardSidebarProps {
  children: React.ReactNode;
  className?: string;
  /** Layout mode (passed through to the underlying `Sidebar`).
   * - `'fixed'` (default): constant-width, viewport-pinned nav rail.
   * - `'flex'`: static flex child whose width is driven by
   *   `--panelcraft-sidebar-width`. Use inside a `flex-row` parent. */
  variant?: 'fixed' | 'flex';
}

/**
 * Sidebar variant used by the comic-creation wizard. Wraps the generic
 * `Sidebar` with a fixed header ("Wizard Settings") and renders `children`
 * beneath it. Forwards a `ref` to the wrapped `<aside>` element.
 *
 * Inherits its layout behavior (`'fixed'` vs `'flex'`) from the `variant`
 * prop, which is passed straight through to `Sidebar`. Provide step
 * controls, character editors, or style pickers as `children`.
 *
 * @example
 * <WizardSidebar variant="flex">
 *   <StepIndicator />
 *   <PromptForm />
 * </WizardSidebar>
 */
export const WizardSidebar = React.forwardRef<
  HTMLDivElement,
  WizardSidebarProps
>(({ children, className, variant }, ref) => {
  return (
    <Sidebar ref={ref} variant={variant} className={className}>
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-white">Wizard Settings</h2>
      </div>
      {children}
    </Sidebar>
  );
});

WizardSidebar.displayName = 'WizardSidebar';
