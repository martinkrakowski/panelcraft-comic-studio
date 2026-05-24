'use client';

import React from 'react';
import type { LayoutTemplate } from '../../lib/layout-templates';

interface LayoutPreviewProps {
  layout: LayoutTemplate;
  className?: string;
}

/**
 * Renders a visual preview of a panel layout.
 * Shows grid positions and panel numbering with calculations memoized.
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
