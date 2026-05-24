'use client';

import React from 'react';

interface SidebarProps {
  children: React.ReactNode;
  className?: string;
}

export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ children, className }, ref) => {
    return (
      <aside
        ref={ref}
        className={`fixed left-0 top-0 h-screen w-64 overflow-y-auto bg-slate-900 border-r border-slate-700 z-30 ${className || ''}`}
      >
        {children}
      </aside>
    );
  }
);

Sidebar.displayName = 'Sidebar';
