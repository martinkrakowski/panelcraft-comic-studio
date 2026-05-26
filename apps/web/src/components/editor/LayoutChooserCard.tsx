'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@panelcraft/ui';

interface LayoutChooserCardProps {
  layoutOptions: string[];
  selectingLayout: boolean;
  onSelectLayout: (layout: string) => void;
}

/**
 * Presentational card shown in the editor when the project has suggested layouts
 * but none has been selected yet. Built on top of the shared Card primitives
 * from @panelcraft/ui for design system consistency.
 */
export function LayoutChooserCard({
  layoutOptions,
  selectingLayout,
  onSelectLayout,
}: LayoutChooserCardProps) {
  return (
    <Card className="border-violet-500/30">
      <CardHeader>
        <CardTitle>Choose a layout</CardTitle>
        <CardDescription>
          The AI suggested these layouts based on your story. Pick one to
          continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {layoutOptions.map((layout) => (
            <button
              key={layout}
              type="button"
              disabled={selectingLayout}
              onClick={() => onSelectLayout(layout)}
              className="text-left p-4 rounded-lg border border-slate-700 bg-slate-800 hover:border-violet-500 hover:bg-violet-500/10 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {layout}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
