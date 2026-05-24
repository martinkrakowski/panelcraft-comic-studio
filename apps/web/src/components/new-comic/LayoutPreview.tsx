'use client';

import React from 'react';
import type { LayoutTemplate } from '../../lib/layout-templates';

/** Props for LayoutPreview component */
interface LayoutPreviewProps {
  /** Layout template defining panel positions (x, y, width, height) */
  layout: LayoutTemplate;
  /** Additional CSS classes applied to the container */
  className?: string;
}

/**
 * Renders a visual preview of a panel layout.
 *
 * Calculates the bounding box from `layout.panels` and positions each
 * panel proportionally inside a relative container, numbered 1..N.
 * Wrapped in `React.memo` because layout objects are stable references
 * and parent re-renders should not retrigger grid math.
 */
const LayoutPreview = React.memo(function LayoutPreview({
  layout,
  className = '',
}: LayoutPreviewProps) {
  const cols = Math.max(...layout.panels.map((p) => p.x + p.width));
  const rows = Math.max(...layout.panels.map((p) => p.y + p.height));

  return (
    <div
      className={`relative bg-slate-900/40 rounded border border-slate-600/50 overflow-hidden ${className}`}
    >
      {layout.panels.map((panel, idx) => (
        <div
          key={idx}
          className="absolute bg-violet-500/20 border border-violet-400/30 flex items-center justify-center text-xs text-violet-300/60 font-mono font-bold"
          style={{
            left: `${(panel.x / cols) * 100}%`,
            top: `${(panel.y / rows) * 100}%`,
            width: `calc(${(panel.width / cols) * 100}% + 1px)`,
            height: `calc(${(panel.height / rows) * 100}% + 1px)`,
          }}
        >
          <span className="text-xs">{idx + 1}</span>
        </div>
      ))}
    </div>
  );
});

export { LayoutPreview };
