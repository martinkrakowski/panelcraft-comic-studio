'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from '@panelcraft/ui';
import { Image as ImageIcon, RefreshCw, Pencil } from 'lucide-react';
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
  /**
   * When provided, each panel renders a Regenerate action that calls this
   * with the panel index. The button is disabled while
   * `regeneratingPanelIndex` matches that panel's index, and hidden when no
   * handler is supplied (e.g., mid-HITL where users review via the
   * top-level review card instead).
   */
  onRegenerate?: (panelIndex: number) => void | Promise<void>;
  /**
   * When provided alongside `onRegenerate`, each panel also renders an
   * Edit action that opens a HITL-style dialog for supplying feedback
   * before regenerating. Hidden when `onRegenerate` is omitted.
   */
  onEdit?: (panelIndex: number) => void;
  regeneratingPanelIndex?: number | null;
}

export function PanelsGrid({
  panels,
  onRegenerate,
  onEdit,
  regeneratingPanelIndex,
}: PanelsGridProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
        Comic Panels
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {panels.map((panel) => {
          const label = getPanelStatusLabel(panel.status);
          // Mid-work signal: panel is queued, mid-generation, or being
          // regenerated via the per-tile button. Drives the animated
          // border ring so the user has a non-static "something is
          // happening" indicator.
          const isBusy =
            regeneratingPanelIndex === panel.index ||
            panel.status === 'pending' ||
            panel.status === 'generating';

          return (
            <Card
              key={panel.id}
              className={`bg-slate-900/20 overflow-hidden flex flex-col justify-between ${
                isBusy
                  ? 'border-transparent animate-panel-busy'
                  : 'border-slate-700/60 hover:border-indigo-400/60'
              }`}
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

                {onRegenerate && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => onRegenerate(panel.index)}
                      disabled={isBusy}
                      className="flex-1 text-xs flex items-center justify-center gap-1.5 border border-slate-800"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${isBusy ? 'animate-spin' : ''}`}
                      />
                      {isBusy ? 'Regenerating…' : 'Regenerate'}
                    </Button>
                    {onEdit && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onEdit(panel.index)}
                        disabled={isBusy}
                        className="flex-1 text-xs flex items-center justify-center gap-1.5 border border-slate-800"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit panel
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
