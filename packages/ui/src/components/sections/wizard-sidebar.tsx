'use client';

import React from 'react';
import { Sidebar } from './sidebar';

/** Props for WizardSidebar component */
interface WizardSidebarProps {
  /** Content to display in wizard sidebar */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Specialized sidebar for wizard workflows.
 * Extends base Sidebar with wizard-specific header section.
 */
export const WizardSidebar = React.forwardRef<
  HTMLDivElement,
  WizardSidebarProps
>(({ children, className }, ref) => {
  return (
    <Sidebar ref={ref} className={className}>
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-white">Wizard Settings</h2>
      </div>
      {children}
    </Sidebar>
  );
});

WizardSidebar.displayName = 'WizardSidebar';
