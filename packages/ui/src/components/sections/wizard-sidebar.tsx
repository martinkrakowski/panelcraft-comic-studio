'use client';

import React, { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Sidebar } from './sidebar';
import {
  AccordionBroadcastProvider,
  type AccordionBroadcast,
} from './collapsible-section';

interface WizardSidebarProps {
  children: React.ReactNode;
  className?: string;
  /** Layout mode (passed through to the underlying `Sidebar`).
   * - `'fixed'` (default): constant-width, viewport-pinned nav rail.
   * - `'flex'`: static flex child whose width is driven by
   *   `--panelcraft-sidebar-width`. Use inside a `flex-row` parent. */
  variant?: 'fixed' | 'flex';
  /** Optional header title. Defaults to "Wizard Settings". */
  title?: string;
}

/**
 * Sidebar variant used by the comic-creation wizard. Wraps the generic
 * `Sidebar` with a fixed header (configurable via `title`, defaults to
 * "Wizard Settings") and renders `children` beneath it. Forwards a `ref`
 * to the wrapped `<aside>` element.
 *
 * Inherits its layout behavior (`'fixed'` vs `'flex'`) from the `variant`
 * prop, which is passed straight through to `Sidebar`. Provide step
 * controls, character editors, or style pickers as `children`.
 *
 * The header also surfaces a [+]/[-] toggle that broadcasts an expand-
 * all / collapse-all command to every nested `CollapsibleSection` via
 * an internal context. Sections that aren't `CollapsibleSection` ignore
 * the broadcast.
 *
 * @example
 * <WizardSidebar variant="flex" title="Project">
 *   <CollapsibleSection title="Workflow Progress">...</CollapsibleSection>
 * </WizardSidebar>
 */
export const WizardSidebar = React.forwardRef<
  HTMLDivElement,
  WizardSidebarProps
>(({ children, className, variant, title = 'Wizard Settings' }, ref) => {
  // `allExpanded` is the *next* state the broadcast will set, which lets
  // the icon advertise the action: when sections are currently expanded
  // we show a minus (next click collapses); when collapsed, a plus.
  // A version counter accompanies the value because the children sync
  // on `version` changes — bumping the counter is the signal, not the
  // boolean, so two consecutive expands (after the user manually closed
  // one section in between) still propagate.
  const [allExpanded, setAllExpanded] = useState(true);
  const [broadcastVersion, setBroadcastVersion] = useState(0);

  const handleToggleAll = () => {
    const next = !allExpanded;
    setAllExpanded(next);
    setBroadcastVersion((v) => v + 1);
  };

  // Pass `null` on the very first render so existing
  // `CollapsibleSection` defaultOpen values control initial layout —
  // we only start broadcasting after the user clicks the toggle.
  const broadcast: AccordionBroadcast | null =
    broadcastVersion === 0
      ? null
      : { version: broadcastVersion, open: allExpanded };

  return (
    <Sidebar ref={ref} variant={variant} className={className}>
      <div className="p-4 border-b border-slate-700 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <button
          type="button"
          onClick={handleToggleAll}
          aria-label={
            allExpanded
              ? 'Collapse all sidebar sections'
              : 'Expand all sidebar sections'
          }
          aria-pressed={allExpanded}
          title={allExpanded ? 'Collapse all' : 'Expand all'}
          className="p-1 rounded border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800/60 hover:border-slate-500 transition-colors"
        >
          {allExpanded ? (
            <Minus className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      <AccordionBroadcastProvider value={broadcast}>
        {children}
      </AccordionBroadcastProvider>
    </Sidebar>
  );
});

WizardSidebar.displayName = 'WizardSidebar';
