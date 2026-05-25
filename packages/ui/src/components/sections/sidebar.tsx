'use client';

import React from 'react';

interface SidebarProps {
  children: React.ReactNode;
  className?: string;
  /** Layout mode.
   * - `'fixed'` (default): absolutely positioned, full-height, left edge of viewport.
   * - `'flex'`: static flex child; transparent background; width driven by
   *   `--panelcraft-sidebar-width` (370px). Use inside a `flex-row` parent. */
  variant?: 'fixed' | 'flex';
}

const fixedClasses =
  'fixed left-0 top-0 h-screen w-64 bg-slate-900 border-r border-slate-700 z-30 overflow-y-auto';
const flexClasses =
  'w-full lg:w-[var(--panelcraft-sidebar-width,370px)] shrink-0 grow-0 bg-transparent border-0 overflow-y-auto';

export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ children, className, variant = 'fixed' }, ref) => {
    const variantClasses = variant === 'flex' ? flexClasses : fixedClasses;
    return (
      <aside
        ref={ref}
        aria-label="Sidebar navigation"
        className={`${variantClasses} ${className || ''}`}
      >
        {children}
      </aside>
    );
  }
);

Sidebar.displayName = 'Sidebar';
