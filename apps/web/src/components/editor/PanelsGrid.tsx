'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@panelcraft/ui';
import { Image as ImageIcon } from 'lucide-react';
import { getPanelStatusLabel } from '../../lib/panel-status';
import { ImageWithFallback } from './ImageWithFallback';

interface GridPanel {
  id: string;
  index: number;
  status: string;
  imageUrl?: string | null;
  prompt?: string;
}

interface PanelsGridProps {
  panels: GridPanel[];
}

export function PanelsGrid({ panels }: PanelsGridProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
        Comic Panels
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {panels.map((panel) => {
          const label = getPanelStatusLabel(panel.status);

          return (
            <Card
              key={panel.id}
              className="border-slate-850/80 bg-slate-900/20 overflow-hidden flex flex-col justify-between"
            >
              <CardHeader className="p-4 border-b border-slate-800/30 flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-bold text-white">
                  Panel {panel.index + 1}
                </CardTitle>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold border-transparent ${label.className}`}
                >
                  {label.text}
                </span>
              </CardHeader>

              <CardContent className="p-4 flex-1 flex flex-col space-y-4">
                <div className="aspect-video relative rounded bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-900">
                  {panel.imageUrl ? (
                    <ImageWithFallback
                      src={panel.imageUrl}
                      alt={`Panel ${panel.index + 1}`}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-600 text-xs space-y-1">
                      <ImageIcon className="h-6 w-6" />
                      <span>No image rendered</span>
                    </div>
                  )}
                </div>

                {panel.prompt ? (
                  <p className="text-xs text-slate-300 leading-relaxed italic line-clamp-3">
                    &ldquo;{panel.prompt}&rdquo;
                  </p>
                ) : (
                  <div className="h-4 w-3/4 bg-slate-800 rounded animate-pulse" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
