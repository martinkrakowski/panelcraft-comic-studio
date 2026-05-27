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

// `overflow-y-scroll` (rather than `overflow-y-auto`) keeps the
// vertical scrollbar visible even when content fits inside the viewport.
// Without it, expanding/collapsing sidebar accordions toggles overflow
// on and off, which makes the scrollbar appear/disappear and shifts the
// inner content width by a few pixels each time — a visible jump.
const fixedClasses =
  'fixed left-0 top-0 h-screen w-64 bg-slate-900 border-r border-slate-700 z-30 overflow-y-scroll';
const flexClasses =
  'w-full lg:w-[var(--panelcraft-sidebar-width,370px)] shrink-0 grow-0 bg-transparent border-0 overflow-y-scroll';

/**
 * Layout/navigation container rendered as a semantic `<aside>`. Forwards a
 * `ref` to the underlying `HTMLDivElement` so consumers can measure or
 * scroll it.
 *
 * @param children - Sidebar contents (links, sections, panels).
 * @param className - Optional Tailwind classes appended after the variant
 *   classes; use for spacing or scoped overrides.
 * @param variant - Layout mode, defaults to `'fixed'`.
 *   - `'fixed'`: absolutely positioned, full-height, pinned to the left edge
 *     of the viewport. Use for a constant-width nav rail (`fixedClasses`).
 *   - `'flex'`: a static flex child whose width comes from the
 *     `--panelcraft-sidebar-width` token. Use inside a `flex-row` parent
 *     when the page already controls overall layout (`flexClasses`).
 *
 * @example
 * <Sidebar variant="flex" className="space-y-4">
 *   <SectionA />
 *   <SectionB />
 * </Sidebar>
 */
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
