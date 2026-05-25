import type { ReactNode } from 'react';

/**
 * Shared viewport chrome: fixed inset dark background with two ambient
 * gradient orbs (violet + cyan). Not exported — consumers use the
 * higher-level AppCanvas* wrappers.
 *
 * @internal
 */
function CanvasBase({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 bg-slate-950 overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />
      {children}
    </div>
  );
}

/**
 * Full-viewport canvas with centered content and no sidebar.
 *
 * Use for:
 * - Onboarding flow
 * - Template chooser (/new/template)
 * - Wizard final steps (review/submit, layout chooser) where the sidebar
 *   is intentionally hidden
 *
 * Provides the dark fixed viewport + ambient orbs. Children are centered
 * both horizontally and vertically.
 */
export function AppCanvasCenter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <CanvasBase>
      <div
        className={`relative h-full flex items-center justify-center ${className ?? ''}`}
      >
        {children}
      </div>
    </CanvasBase>
  );
}

/**
 * Full-viewport two-pane canvas: sidebar (left) + main content (right).
 *
 * Use for:
 * - NewComicWizard steps 0-2 (with NewComicWizardSidebar variant="flex")
 * - ComicEditor HITL states (with EditorSidebar)
 *
 * The `sidebar` slot is responsible for its own `pt-20` padding (via
 * WizardSidebar/EditorSidebar `className="pt-20"`) when it must clear the
 * global sticky WorkspaceShell header.
 *
 * Children are rendered inside a bare `<div className="flex-1 overflow-y-auto">`
 * with **no built-in padding or spacing**. Consumers must supply their own
 * `px-*`, `pb-*`, `space-y-*` etc. (see topStrip for pinned header content
 * that should not scroll).
 *
 * @param clearHeader - When true (default), applies `mt-16` to the content
 *   pane to reserve space under the sticky header. Set false for full-bleed
 *   two-pane experiences.
 */
export function AppCanvasTwoPane({
  sidebar,
  topStrip,
  children,
  /** Reserve top space for the sticky WorkspaceShell header. Default true. */
  clearHeader = true,
}: {
  sidebar: ReactNode;
  topStrip?: ReactNode;
  children: ReactNode;
  clearHeader?: boolean;
}) {
  return (
    <CanvasBase>
      <div className="relative h-full flex flex-col lg:flex-row gap-[var(--panelcraft-gutter-space)]">
        {sidebar}
        <div
          className={`flex-1 flex flex-col overflow-hidden rounded-xl bg-slate-900/50 backdrop-blur-sm relative ${clearHeader ? 'mt-16' : ''}`}
        >
          {topStrip}
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </CanvasBase>
  );
}
