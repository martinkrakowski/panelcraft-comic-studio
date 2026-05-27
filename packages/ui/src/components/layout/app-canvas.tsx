'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useIsDesktop, useMobileSidebar } from './mobile-sidebar';

/**
 * Shared viewport chrome: fixed inset dark background with two ambient
 * gradient orbs (violet + cyan). Not exported — consumers use the
 * higher-level AppCanvas* wrappers.
 *
 * @internal
 */
function CanvasBase({ children }: { children: ReactNode }) {
  // `max-w-[100dvw]` caps the width at the true content viewport. The fixed
  // containing block otherwise resolves to `window.innerWidth`, which
  // includes the scrollbar gutter on platforms with non-overlay scrollbars
  // (and Chrome DevTools mobile emulation), inflating `scrollWidth` past
  // the visible viewport.
  return (
    <div className="fixed inset-0 bg-slate-950 overflow-hidden max-w-[100dvw]">
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
 * Full-viewport single-pane canvas: just the content panel (no sidebar).
 *
 * Use for:
 * - `/projects/[id]/view` (comic page view) where there's no per-section
 *   sidebar nav but we still want viewport-locked chrome + a scrollable
 *   content area + a pinned footer.
 *
 * Slots match `AppCanvasTwoPane` minus `sidebar`:
 * - `topStrip` — pinned header content inside the content panel.
 * - `children` — scrollable area (consumers supply their own padding).
 * - `footer` — pinned footer, typically a `<ContentPanelFooter>`.
 *
 * @param clearHeader - When true (default), insets the content card from
 *   the canvas edges (`mt-[75px] mr-2.5 mb-2.5`) — top reserves space
 *   under the sticky WorkspaceShell header, right/bottom give the rounded
 *   card visible breathing room. Set `false` for a full-bleed pane with
 *   no insets on any side.
 */
export function AppCanvasOnePane({
  topStrip,
  children,
  footer,
  clearHeader = true,
}: {
  topStrip?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  clearHeader?: boolean;
}) {
  return (
    <CanvasBase>
      <div className="relative h-full flex flex-col gap-[var(--panelcraft-gutter-space)]">
        <div
          className={`flex-1 flex flex-col overflow-hidden rounded-xl bg-slate-900/50 backdrop-blur-sm relative ${clearHeader ? 'mt-[75px] mr-2.5 mb-2.5' : ''}`}
        >
          {topStrip}
          <div className="flex-1 overflow-y-auto">{children}</div>
          {footer}
        </div>
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
 * The `footer` slot is pinned at the bottom of the content panel (sibling to
 * the scroll area, not under the sidebar) — typically a `<ContentPanelFooter>`
 * carrying back/next navigation.
 *
 * ## Mobile portal behavior
 *
 * On viewports < lg (1024px) the same `sidebar` React node is moved into
 * the mobile drawer via `createPortal`. This avoids double-mounting the
 * sidebar tree (which would duplicate `useEffect`s, IndexedDB writers,
 * and accordion state). The decision is gated on three signals:
 *
 * 1. A `MobileSidebarProvider` is in scope (`ctx !== null`),
 * 2. The viewport is below `lg` (`useIsDesktop()` returned false),
 * 3. The drawer slot is currently mounted (`ctx.hasSlot` is true — i.e.
 *    the user has opened the drawer at least once and Radix has the
 *    content mounted, OR Radix' `forceMount` would keep it mounted).
 *
 * When all three hold, the inline sidebar render is suppressed and the
 * sidebar is portaled into the drawer's slot div instead. Otherwise the
 * sidebar renders inline as it always has.
 *
 * @param clearHeader - When true (default), insets the content card from
 *   the canvas edges (`mt-[75px] mr-2.5 mb-2.5`) — top reserves space
 *   under the sticky WorkspaceShell header, right/bottom give the rounded
 *   card visible breathing room. Set `false` for full-bleed two-pane
 *   experiences with no insets on any side.
 */
export function AppCanvasTwoPane({
  sidebar,
  topStrip,
  children,
  footer,
  /** Reserve top space for the sticky WorkspaceShell header. Default true. */
  clearHeader = true,
}: {
  sidebar: ReactNode;
  topStrip?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  clearHeader?: boolean;
}) {
  const ctx = useMobileSidebar();
  const isDesktop = useIsDesktop();

  // Mobile-hide is done in CSS (`hidden lg:contents` wrapper) rather than
  // JS — `useIsDesktop()` returns `true` during SSR, so a JS-only check
  // would render the inline sidebar in the SSR HTML on mobile. The user
  // would briefly see the sidebar's "Project" header row peeking through
  // the translucent sticky header before hydration flips it. Pushing the
  // decision into CSS means the SSR output is already hidden on `< lg`.
  //
  // The portal decision still uses JS (`useIsDesktop` + drawer state)
  // because the portal target only exists when Radix has mounted the
  // drawer Content (i.e., `hasSlot` is true).
  //
  // Skip the mobile-hide when no `MobileSidebarProvider` is mounted: in
  // tests, Storybook stories, and anywhere the primitive is used in
  // isolation there is no drawer to portal into, so hiding the inline
  // sidebar would leave the user with no sidebar at all on `< lg`.
  const shouldPortal =
    !!ctx && !isDesktop && ctx.hasSlot && !!ctx.sidebarSlotRef.current;

  const portaledSidebar =
    shouldPortal && ctx
      ? createPortal(sidebar, ctx.sidebarSlotRef.current!)
      : null;

  return (
    <CanvasBase>
      <div className="relative h-full flex flex-col lg:flex-row gap-[var(--panelcraft-gutter-space)]">
        {/* Inline slot. `hidden lg:contents` keeps the sidebar tree in
            React but hides it from the mobile DOM layout — `display:
            contents` on desktop makes the wrapper invisible to the flex
            container so the `<aside>` lays out as if the wrapper weren't
            there. When `shouldPortal` flips, the inline slot renders
            null and the portaled copy below takes over. Without a
            provider, fall back to a plain `contents` wrapper so the
            sidebar renders at every breakpoint. */}
        <div className={ctx ? 'hidden lg:contents' : 'contents'}>
          {shouldPortal ? null : sidebar}
        </div>
        <div
          className={`flex-1 flex flex-col overflow-hidden rounded-xl bg-slate-900/50 backdrop-blur-sm relative ${clearHeader ? 'mt-[75px] mr-2.5 mb-2.5' : ''}`}
        >
          {topStrip}
          <div className="flex-1 overflow-y-auto">{children}</div>
          {footer}
        </div>
      </div>
      {portaledSidebar}
    </CanvasBase>
  );
}
