'use client';

import React from 'react';
import { Sidebar } from './sidebar';

interface WizardSidebarProps {
  children: React.ReactNode;
  className?: string;
}

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
