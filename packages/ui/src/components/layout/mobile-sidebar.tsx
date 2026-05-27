'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Shared context that lets the mobile drawer coordinate three otherwise
 * disconnected concerns:
 * - the trigger (rendered inside `WorkspaceShell`),
 * - the drawer content (rendered after `<main>` in `WorkspaceShell`),
 * - the per-route page sidebar (rendered by `AppCanvasTwoPane`).
 *
 * The drawer exposes a "slot" `<div ref={sidebarSlotRef} />` into which
 * `AppCanvasTwoPane` portals the page sidebar on mobile so the sidebar
 * tree is mounted exactly once across desktop and mobile breakpoints.
 *
 * Consumers outside a provider see `null` from `useMobileSidebar()` — this
 * is intentional so unit tests and Storybook stories don't have to wrap
 * everything in a provider just to render a canvas.
 */
interface MobileSidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Ref to the drawer's portal target. Null until the drawer mounts. */
  sidebarSlotRef: React.RefObject<HTMLDivElement | null>;
  /** True once the drawer has mounted and attached the ref. Drives the
   * `AppCanvasTwoPane` portal decision — it can't portal into a null
   * target. */
  hasSlot: boolean;
}

const MobileSidebarContext =
  React.createContext<MobileSidebarContextValue | null>(null);

/**
 * Provider that owns drawer open state and the portal slot ref. Wrap the
 * app root once (typically in `app/layout.tsx`) so the trigger, drawer,
 * and `AppCanvasTwoPane` all share a single source of truth.
 */
export function MobileSidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const sidebarSlotRef = React.useRef<HTMLDivElement | null>(null);
  const [hasSlot, setHasSlot] = React.useState(false);

  // Stable callback that the drawer wires to a `ref` callback on its slot
  // div. When the drawer mounts (open becomes true), Radix mounts the
  // content, the ref attaches, and `hasSlot` flips to true — which is
  // what `AppCanvasTwoPane` watches before issuing `createPortal`.
  const attachSlot = React.useCallback((node: HTMLDivElement | null) => {
    sidebarSlotRef.current = node;
    setHasSlot(Boolean(node));
  }, []);

  const value = React.useMemo<MobileSidebarContextValue>(
    () => ({ open, setOpen, sidebarSlotRef, hasSlot }),
    [open, hasSlot]
  );

  // Expose the slot attach callback via context for the drawer. We piggy-
  // back on the same context to avoid a second provider.
  return (
    <MobileSidebarContext.Provider value={value}>
      <MobileSidebarSlotAttachContext.Provider value={attachSlot}>
        {children}
      </MobileSidebarSlotAttachContext.Provider>
    </MobileSidebarContext.Provider>
  );
}

/**
 * Internal-only context carrying the `ref` callback the drawer needs to
 * attach to its slot div. Split out so the public `useMobileSidebar()`
 * return shape stays minimal.
 */
const MobileSidebarSlotAttachContext = React.createContext<
  ((node: HTMLDivElement | null) => void) | null
>(null);

/**
 * Read mobile sidebar context. Returns `null` outside a provider so
 * components can gracefully no-op (used by `AppCanvasTwoPane` and the
 * trigger button so they can be rendered in test environments that
 * don't bother wrapping in `MobileSidebarProvider`).
 */
export function useMobileSidebar(): MobileSidebarContextValue | null {
  return React.useContext(MobileSidebarContext);
}

/**
 * Client-side matchMedia hook that reports whether the viewport is at
 * least `lg` (1024px). Returns `true` during SSR so the server-rendered
 * tree matches today's desktop default — the `useEffect` then flips it
 * after hydration on narrow viewports.
 *
 * Note: SSR returning `true` means brief mobile flashes of the desktop
 * sidebar are theoretically possible, but `AppCanvasTwoPane` only
 * portals when `hasSlot` is also true (drawer mounted), so in practice
 * the inline render is exactly what we want pre-drawer.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  return isDesktop;
}

/**
 * Hamburger button that opens the mobile drawer. Hidden on `lg+`. Returns
 * `null` when no `MobileSidebarProvider` is mounted so the same
 * component can be dropped into the shell unconditionally.
 */
export function MobileSidebarTrigger({ className }: { className?: string }) {
  const ctx = useMobileSidebar();
  if (!ctx) return null;
  return (
    <button
      type="button"
      onClick={() => ctx.setOpen(true)}
      aria-label="Open navigation menu"
      className={cn(
        'lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors',
        className
      )}
    >
      <Menu className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

export interface MobileSidebarNavLink {
  href: string;
  label: string;
}

interface MobileSidebarDrawerProps {
  /** Top-of-drawer brand mark (consumer supplies — keeps drawer agnostic
   * of the app's logo source). */
  brandMark?: React.ReactNode;
  /** Global nav links shown above any portaled page sidebar. */
  navLinks?: MobileSidebarNavLink[];
  /** Optional renderer for each nav link. Falls back to a plain
   * `<a href>` so the primitive can stand alone, but the web app
   * passes a Next `Link`-aware renderer to keep client navigation. */
  renderNavLink?: (
    link: MobileSidebarNavLink,
    onSelect: () => void
  ) => React.ReactNode;
}

/**
 * Full-viewport Radix Dialog that hosts the global nav links and any
 * page sidebar portaled in via `AppCanvasTwoPane`. Fade-only animation
 * (no slide). Covers the sticky `z-40` header by sitting at `z-50`.
 */
export function MobileSidebarDrawer({
  brandMark,
  navLinks,
  renderNavLink,
}: MobileSidebarDrawerProps) {
  const ctx = useMobileSidebar();
  const attachSlot = React.useContext(MobileSidebarSlotAttachContext);
  if (!ctx) return null;

  const handleSelect = () => ctx.setOpen(false);

  return (
    <DialogPrimitive.Root
      open={ctx.open}
      onOpenChange={ctx.setOpen}
      modal={false}
    >
      <DialogPrimitive.Portal>
        {/* Fade-only overlay; no slide-* classes. Covers the sticky
            z-40 WorkspaceShell header. */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0'
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          // `fixed inset-0` pins all four edges to the viewport — explicit
          // w-screen/h-dvh are redundant *and* can resolve to smaller values
          // than the visual viewport on browsers with animated chrome (iOS
          // URL bar). We rely on `inset-0` only.
          //
          // `max-w-[100dvw]` caps the width at the true content viewport.
          // Without it, the fixed-position containing block uses
          // `window.innerWidth`, which on platforms with non-overlay
          // scrollbars (and Chrome DevTools mobile emulation) includes the
          // scrollbar gutter — leaving the sheet ~17–62px wider than the
          // visible viewport and pushing `document.scrollWidth` past 100vw.
          className={cn(
            'fixed inset-0 z-50 bg-slate-950 flex flex-col max-w-[100dvw]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'lg:hidden'
          )}
        >
          {/* Header row: brand on the left, X close on the right. */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800/80 shrink-0">
            <DialogPrimitive.Title className="sr-only">
              Navigation menu
            </DialogPrimitive.Title>
            <div className="flex items-center">{brandMark}</div>
            <DialogPrimitive.Close
              aria-label="Close navigation menu"
              className="inline-flex items-center justify-center h-10 w-10 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          {/* Nav links — always rendered when provided. */}
          {navLinks && navLinks.length > 0 && (
            <nav className="px-4 py-4 border-b border-slate-800/60 shrink-0">
              <ul className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    {renderNavLink ? (
                      renderNavLink(link, handleSelect)
                    ) : (
                      <a
                        href={link.href}
                        onClick={handleSelect}
                        className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-800/60 hover:text-white"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Portal slot — page sidebars from `AppCanvasTwoPane` land
              here. Drawer owns vertical scrolling so the sidebar
              variant doesn't double-scroll. */}
          <div
            ref={attachSlot}
            className="flex-1 overflow-y-auto"
            data-mobile-sidebar-slot=""
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
