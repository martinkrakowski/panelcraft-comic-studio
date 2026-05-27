'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

type ContentPanelFooterProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Footer chrome for the content panel — pinned at the bottom (`flex-shrink-0`),
 * top border, slightly stronger background than the scrollable content area.
 *
 * Used as the `footer` slot of `<AppCanvasTwoPane>` and standalone in views
 * that don't use AppCanvas (e.g. `/projects/[id]/view`). Width is constrained
 * by its parent — inside AppCanvasTwoPane it lives inside the content panel
 * (not under the sidebar).
 *
 * Default layout: `flex items-center justify-between` so the typical pattern
 * "secondary action left, primary action right" works without extra wrappers.
 * Override `className` for centered or other layouts.
 *
 * @example
 * <ContentPanelFooter>
 *   <Button variant="outline" onClick={onBack}>Back</Button>
 *   <Button onClick={onNext}>Next</Button>
 * </ContentPanelFooter>
 */
export const ContentPanelFooter = React.forwardRef<
  HTMLDivElement,
  ContentPanelFooterProps
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex-shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-4 border-t border-slate-800/60 bg-slate-900/40',
      className
    )}
    {...props}
  >
    {children}
  </div>
));
ContentPanelFooter.displayName = 'ContentPanelFooter';
