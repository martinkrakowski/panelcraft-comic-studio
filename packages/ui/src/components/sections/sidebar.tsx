'use client';

import React from 'react';

/** Props for Sidebar component */
interface SidebarProps {
  /** Content to display in sidebar */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Fixed-width left sidebar panel (256px) with scrollable content.
 *
 * Positioned absolutely on the left side of the viewport with z-index 30
 * to sit above page content but below modals. Includes an `aria-label`
 * for screen reader navigation landmarks.
 *
 * @example
 * ```tsx
 * <Sidebar className="pt-20">
 *   <NavigationMenu />
 * </Sidebar>
 * ```
 */
export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ children, className }, ref) => {
    return (
      <aside
        ref={ref}
        aria-label="Sidebar navigation"
        className={`fixed left-0 top-0 h-screen w-64 overflow-y-auto bg-slate-900 border-r border-slate-700 z-30 ${className || ''}`}
      >
        {children}
      </aside>
    );
  }
);

Sidebar.displayName = 'Sidebar';
