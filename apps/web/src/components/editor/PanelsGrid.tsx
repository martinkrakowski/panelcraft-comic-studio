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
import { resolveComicPageLayout } from '../../lib/comic-page-layouts';
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
   * Persisted layout choice. When set to a known template ID,
   * `resolveComicPageLayout` produces a real grid config (columns + rows +
   * per-cell placements) so the editor preview matches the composed page
   * the user will see on `/view`. Without it the grid falls back to a
   * 2-column flow.
   */
  selectedLayout?: string | null;
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

/**
 * Editor view of the comic's panels. Renders each panel as a card with
 * status badge, image preview, prompt, and per-tile Regenerate / Edit
 * actions. When `selectedLayout` matches a catalog template the grid uses
 * the template's columns/rows/cellPlacements so a layout swap visibly
 * rearranges the panels in place; otherwise falls back to a 2-column flow.
 *
 * @param props.panels - Panels to render in array order.
 * @param props.selectedLayout - Layout template id or legacy free-form
 *   string; template-id matches drive the rich grid placement.
 * @param props.onRegenerate - When provided, each card renders a Regenerate
 *   button wired to this callback. Hidden during mid-HITL review.
 * @param props.onEdit - Pairs with `onRegenerate`; renders an Edit button
 *   that opens the feedback dialog for the targeted panel.
 * @param props.regeneratingPanelIndex - Panel currently mid-regeneration;
 *   drives the per-tile busy indicator and disables both actions on it.
 * @returns A `<div>` containing the panels grid.
 */
export function PanelsGrid({
  panels,
  selectedLayout,
  onRegenerate,
  onEdit,
  regeneratingPanelIndex,
}: PanelsGridProps) {
  // Drive the editor grid from the persisted layout when one is set: lets
  // the user see a layout swap (PATCH /layout) visibly rearrange their
  // panels in place, instead of needing to jump to /view to confirm the
  // change took effect. Falls back to the prior 2-column flow when no
  // layout is selected yet (e.g., mid-HITL on a fresh project).
  const layout = selectedLayout
    ? resolveComicPageLayout(selectedLayout, panels.length)
    : null;
  const useLayoutGrid = Boolean(layout?.cellPlacements?.length);
  const gridStyle = useLayoutGrid
    ? {
        gridTemplateColumns: layout!.columns,
        gridTemplateRows: layout!.rows,
        aspectRatio: layout!.aspectRatio,
      }
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Comic Panels
        </h3>
        {useLayoutGrid && layout && (
          <span className="text-[10px] uppercase tracking-widest text-slate-500">
            Layout: {layout.label}
          </span>
        )}
      </div>
      <div
        className={
          useLayoutGrid
            ? 'grid gap-4 mx-auto w-full max-w-2xl'
            : 'grid grid-cols-1 md:grid-cols-2 gap-6'
        }
        style={gridStyle}
      >
        {panels.map((panel, panelIdx) => {
          const label = getPanelStatusLabel(panel.status);
          // Mid-work signal: panel is queued, mid-generation, or being
          // regenerated via the per-tile button. Drives the animated
          // border ring so the user has a non-static "something is
          // happening" indicator.
          const isBusy =
            regeneratingPanelIndex === panel.index ||
            panel.status === 'pending' ||
            panel.status === 'generating';

          // Use the map index for cell placement (O(1)) — `panels.indexOf`
          // was both O(n²) overall and unsafe if two panel refs ever match.
          const cellPlacement = useLayoutGrid
            ? layout!.cellPlacements?.[panelIdx]
            : undefined;
          return (
            <Card
              key={panel.id}
              className={`bg-slate-900/20 overflow-hidden flex flex-col justify-between ${
                isBusy
                  ? 'border-transparent animate-panel-busy'
                  : 'border-slate-700/60 hover:border-indigo-400/60'
              }`}
              style={cellPlacement ? { gridArea: cellPlacement } : undefined}
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
                      {/* Hide the text while the panel is mid-render (busy
                          state already shows the pulsing border via
                          animate-panel-busy). Only surface explanatory
                          copy when the render actually failed. */}
                      {panel.status === 'failed' && (
                        <span className="text-red-400">Failed to render</span>
                      )}
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
                  // `flex-wrap` + `min-w-[8rem]` lets the two actions sit
                  // side-by-side in wide cells but stack into single-column
                  // rows when the parent grid cell is narrow (e.g. inset
                  // panels in splash layouts) so the label never gets cut
                  // off. `basis-0 grow` plays the same equal-share role as
                  // the old `flex-1` once they're on one row.
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => onRegenerate(panel.index)}
                      disabled={isBusy}
                      className="basis-0 grow min-w-[8rem] text-xs flex items-center justify-center gap-1.5 border border-slate-800"
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
                        className="basis-0 grow min-w-[8rem] text-xs flex items-center justify-center gap-1.5 border border-slate-800"
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
