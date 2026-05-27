'use client';

import React, { useContext, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Broadcast channel used by an ancestor container to set every nested
 * `CollapsibleSection`'s open state at once (e.g., the WizardSidebar's
 * expand-all / collapse-all toggle). `version` increments on each
 * broadcast so consuming sections can detect a fresh request even if
 * `open` happens to match the prior target — bumping the counter is the
 * signal, not the value.
 */
export interface AccordionBroadcast {
  version: number;
  open: boolean;
}

const AccordionBroadcastContext =
  React.createContext<AccordionBroadcast | null>(null);

/**
 * Provider for the broadcast channel. Wrap any subtree whose
 * CollapsibleSections should respond to programmatic expand/collapse
 * commands. Sections outside the provider fall back to purely local
 * (uncontrolled) state, preserving the original behavior.
 */
export const AccordionBroadcastProvider = AccordionBroadcastContext.Provider;

/** Props for CollapsibleSection component */
interface CollapsibleSectionProps {
  /** Section title/heading */
  title: string;
  /** Content to display when section is open */
  children: React.ReactNode;
  /** Whether section is open by default */
  defaultOpen?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Expandable section with chevron toggle and smooth animations.
 *
 * Manages its own open/closed state locally. Implements ARIA disclosure
 * pattern: the trigger uses `aria-expanded` and `aria-controls` to point
 * at the panel, which has `role="region"`. The trigger is always
 * `type="button"` so it does not submit enclosing forms.
 *
 * @example
 * ```tsx
 * <CollapsibleSection title="Genres" defaultOpen>
 *   <GenrePicker />
 * </CollapsibleSection>
 * ```
 */
export const CollapsibleSection = React.forwardRef<
  HTMLDivElement,
  CollapsibleSectionProps
>(({ title, children, defaultOpen = true, className }, ref) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();
  const contentId = `collapsible-content-${id}`;

  // Subscribe to the parent's broadcast channel (if one is mounted).
  // When the broadcast `version` changes we sync local state to the
  // broadcast `open` value. This is React's "Adjusting State Based on
  // Props" pattern — guarded by a ref-stored last-seen version so the
  // setter only fires once per broadcast and not on every re-render.
  const broadcast = useContext(AccordionBroadcastContext);
  const lastBroadcastVersionRef = useRef<number | null>(null);
  if (
    broadcast !== null &&
    broadcast.version !== lastBroadcastVersionRef.current
  ) {
    lastBroadcastVersionRef.current = broadcast.version;
    setIsOpen(broadcast.open);
  }

  return (
    <div ref={ref} className={`border-b border-slate-700 ${className || ''}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-widest">
          {title}
        </h3>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${
            isOpen ? 'rotate-0' : '-rotate-90'
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          id={contentId}
          className="px-4 py-3 space-y-3 bg-slate-800/20"
          role="region"
        >
          {children}
        </div>
      )}
    </div>
  );
});

CollapsibleSection.displayName = 'CollapsibleSection';
