/**
 * Comic-page layout templates that arrange approved panels on a single page.
 *
 * The LLM in `suggestLayouts` returns free-form labels like "4-panel 2x2 grid"
 * or "Full-page splash with 2 insets". Rather than parse those strings at
 * render time, we match against a small set of known templates and fall back
 * to a sensible grid sized to the panel count.
 *
 * Each template returns CSS grid configuration plus optional per-cell
 * placement so we can support feature layouts like splash + insets.
 */

export interface ComicPageGridConfig {
  /** CSS `grid-template-columns` value. */
  columns: string;
  /** CSS `grid-template-rows` value, or undefined for auto rows. */
  rows?: string;
  /**
   * Optional explicit placement for each panel index. When omitted, panels
   * flow into cells in order. Each entry is a CSS `grid-area` shorthand
   * (`row-start / col-start / row-end / col-end`).
   */
  cellPlacements?: string[];
  /** Page aspect ratio (width / height). Defaults to 2/3 (portrait). */
  aspectRatio?: string;
  /** Human-readable label echoed back to the user. */
  label: string;
}

/**
 * Parse the implied panel count from a layout label like
 * "3-panel grid (1x3)". Returns `fallback` when the label has no
 * `<n>-panel` token. Mirrors the backend helper in
 * `packages/comic-generation/.../ImageGenerationNodes.ts` so the
 * brainstorm preview shows the same cell count the workflow will use.
 */
export function inferPanelCountFromLayout(
  label: string | null | undefined,
  fallback: number
): number {
  if (!label) return fallback;
  const match = label.match(/(\d+)\s*-?\s*panel/i);
  if (!match) return fallback;
  const parsed = parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Match a free-form layout string to a known template. Returns a sensible
 * default if no template matches the label exactly.
 */
export function resolveComicPageLayout(
  selectedLayout: string | null | undefined,
  panelCount: number
): ComicPageGridConfig {
  const label = (selectedLayout || '').toLowerCase();

  if (label.includes('splash') && label.includes('inset')) {
    // 1 large panel on top, 2 smaller insets along the bottom.
    return {
      columns: '1fr 1fr',
      rows: '2fr 1fr',
      cellPlacements: ['1 / 1 / 2 / 3', '2 / 1 / 3 / 2', '2 / 2 / 3 / 3'],
      aspectRatio: '2 / 3',
      label: 'Full-page splash with insets',
    };
  }
  if (label.includes('large') && label.includes('thumbnail')) {
    // 1 dominant panel + 3 thumbnails on the right.
    return {
      columns: '2fr 1fr',
      rows: 'repeat(3, 1fr)',
      cellPlacements: [
        '1 / 1 / 4 / 2',
        '1 / 2 / 2 / 3',
        '2 / 2 / 3 / 3',
        '3 / 2 / 4 / 3',
      ],
      aspectRatio: '2 / 3',
      label: '1 large panel + 3 thumbnails',
    };
  }
  if (label.includes('2x2')) {
    return {
      columns: '1fr 1fr',
      rows: '1fr 1fr',
      aspectRatio: '2 / 3',
      label: '2 × 2 grid',
    };
  }
  if (label.includes('1x3') || label.includes('3-panel')) {
    return {
      columns: '1fr',
      rows: 'repeat(3, 1fr)',
      aspectRatio: '2 / 3',
      label: '3-panel vertical',
    };
  }
  if (label.includes('horizontal') || label.includes('6-panel strip')) {
    return {
      columns: `repeat(${Math.max(panelCount, 2)}, 1fr)`,
      rows: '1fr',
      aspectRatio: '3 / 1',
      label: 'Horizontal strip',
    };
  }
  if (label.includes('2-column')) {
    return {
      columns: '1fr 1fr',
      rows: `repeat(${Math.max(Math.ceil(panelCount / 2), 1)}, 1fr)`,
      aspectRatio: '2 / 3',
      label: '2-column vertical strip',
    };
  }

  // Fallback: arrange panels in a roughly-square grid sized to panel count.
  const cols = Math.ceil(Math.sqrt(panelCount));
  const rows = Math.ceil(panelCount / cols);
  return {
    columns: `repeat(${cols}, 1fr)`,
    rows: `repeat(${rows}, 1fr)`,
    aspectRatio: '2 / 3',
    label: selectedLayout || `${cols} × ${rows} grid`,
  };
}
