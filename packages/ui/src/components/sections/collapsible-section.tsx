'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

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
 * Manages open/closed state locally with visual feedback.
 */
export const CollapsibleSection = React.forwardRef<
  HTMLDivElement,
  CollapsibleSectionProps
>(({ title, children, defaultOpen = true, className }, ref) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const contentId = `collapsible-content-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div ref={ref} className={`border-b border-slate-700 ${className || ''}`}>
      <button
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
