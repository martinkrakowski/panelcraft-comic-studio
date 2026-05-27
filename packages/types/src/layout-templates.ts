/**
 * Smart Dynamic Panel Layouts (1-4 panels)
 *
 * Layout geometry lives in @panelcraft/types so it can be consumed by:
 *   - the web app (renderers, sidebar UI, dialogs)
 *   - the API worker (composition prompt construction, programmatic
 *     pre-composition with `sharp`)
 *
 * Keeping the data in a shared package preserves monorepo boundaries —
 * the backend never imports from the frontend tree.
 */

export interface PanelRect {
  /** Grid column position (0-3 for max 4-panel layout) */
  x: number;
  /** Grid row position (0-3) */
  y: number;
  /** Width in grid units (1-4) */
  width: number;
  /** Height in grid units (1-4) */
  height: number;
}

export type LayoutMood = 'dramatic' | 'balanced' | 'dynamic';

export interface LayoutTemplate {
  /** Unique layout identifier */
  id: string;
  /** Display name for users */
  name: string;
  /** Professional description of layout use case */
  description: string;
  /** Number of panels in this layout */
  panelCount: 1 | 2 | 3 | 4;
  /** Panel definitions (x, y, width, height in 4x4 grid) */
  panels: PanelRect[];
  /** CSS grid template for rendering */
  gridTemplate: string;
  /** Emotional impact: dramatic, balanced, dynamic */
  mood: LayoutMood;
}

// 1-PANEL LAYOUTS
export const LAYOUTS_1_PANEL: LayoutTemplate[] = [
  {
    id: 'splash-full',
    name: 'Full Page Splash',
    description: 'Dramatic establishing shot or emotional peak moment',
    panelCount: 1,
    mood: 'dramatic',
    panels: [{ x: 0, y: 0, width: 4, height: 4 }],
    gridTemplate: '1fr',
  },
];

// 2-PANEL LAYOUTS
export const LAYOUTS_2_PANELS: LayoutTemplate[] = [
  {
    id: 'vertical-split',
    name: 'Vertical Split',
    description:
      'Two equal columns for side-by-side comparison or action vs reaction',
    panelCount: 2,
    mood: 'balanced',
    panels: [
      { x: 0, y: 0, width: 2, height: 4 },
      { x: 2, y: 0, width: 2, height: 4 },
    ],
    gridTemplate: '1fr 1fr / 1fr 1fr',
  },
  {
    id: 'horizontal-split',
    name: 'Horizontal Split',
    description: 'Top and bottom panels for narrative flow or cause and effect',
    panelCount: 2,
    mood: 'balanced',
    panels: [
      { x: 0, y: 0, width: 4, height: 2 },
      { x: 0, y: 2, width: 4, height: 2 },
    ],
    gridTemplate: '1fr 1fr / 1fr',
  },
  {
    id: 'asymmetric-large-inset',
    name: 'Dominant + Inset',
    description:
      'Large dominant panel with small reactive detail panel tucked in corner',
    panelCount: 2,
    mood: 'dynamic',
    panels: [
      { x: 0, y: 0, width: 3, height: 4 },
      { x: 3, y: 2, width: 1, height: 2 },
    ],
    gridTemplate: '1fr 1fr / 1fr 1fr',
  },
  {
    id: 'l-shaped',
    name: 'L-Shaped',
    description: 'Large panel with smaller supporting panel in corner',
    panelCount: 2,
    mood: 'dynamic',
    panels: [
      { x: 0, y: 0, width: 4, height: 3 },
      { x: 2, y: 3, width: 2, height: 1 },
    ],
    gridTemplate: '3fr 1fr / 1fr 1fr',
  },
];

// 3-PANEL LAYOUTS
export const LAYOUTS_3_PANELS: LayoutTemplate[] = [
  {
    id: 'classic-flow',
    name: 'Classic Flow',
    description:
      'Small setup (top-left) → medium action (top-right) → large impact (bottom)',
    panelCount: 3,
    mood: 'balanced',
    panels: [
      { x: 0, y: 0, width: 2, height: 2 },
      { x: 2, y: 0, width: 2, height: 2 },
      { x: 0, y: 2, width: 4, height: 2 },
    ],
    gridTemplate: '1fr 1fr / 1fr 1fr',
  },
  {
    id: 'establishing-duo',
    name: 'Establishing + Duo',
    description:
      'Large establishing shot on top, two reaction panels side-by-side below',
    panelCount: 3,
    mood: 'balanced',
    panels: [
      { x: 0, y: 0, width: 4, height: 2 },
      { x: 0, y: 2, width: 2, height: 2 },
      { x: 2, y: 2, width: 2, height: 2 },
    ],
    gridTemplate: '1fr 1fr / 1fr 1fr',
  },
  {
    id: 'vertical-stack-varied',
    name: 'Stacked Varied Heights',
    description:
      'Three panels stacked vertically with varying heights for rhythm',
    panelCount: 3,
    mood: 'dynamic',
    panels: [
      { x: 0, y: 0, width: 4, height: 1 },
      { x: 0, y: 1, width: 4, height: 2 },
      { x: 0, y: 3, width: 4, height: 1 },
    ],
    gridTemplate: '1fr 2fr 1fr / 1fr',
  },
  {
    id: 'diagonal-dynamic',
    name: 'Diagonal Dynamic',
    description:
      'Large diagonal panel with two smaller panels creating dynamic flow',
    panelCount: 3,
    mood: 'dynamic',
    panels: [
      { x: 0, y: 0, width: 3, height: 2 },
      { x: 3, y: 0, width: 1, height: 2 },
      { x: 1, y: 2, width: 3, height: 2 },
    ],
    gridTemplate: '1fr 1fr / 1fr 1fr',
  },
  {
    id: 'dominant-insets',
    name: 'Dominant + Dual Insets',
    description: 'Large central focus with two smaller reaction/detail panels',
    panelCount: 3,
    mood: 'dramatic',
    panels: [
      { x: 0, y: 0, width: 3, height: 4 },
      { x: 3, y: 0, width: 1, height: 2 },
      { x: 3, y: 2, width: 1, height: 2 },
    ],
    gridTemplate: '1fr 1fr / 1fr 1fr',
  },
];

// 4-PANEL LAYOUTS
export const LAYOUTS_4_PANELS: LayoutTemplate[] = [
  {
    id: 'grid-2x2-variable',
    name: '2x2 Grid Variable',
    description: '2x2 grid with variable sizes for visual interest and pacing',
    panelCount: 4,
    mood: 'balanced',
    panels: [
      { x: 0, y: 0, width: 2, height: 2 },
      { x: 2, y: 0, width: 2, height: 2 },
      { x: 0, y: 2, width: 2, height: 2 },
      { x: 2, y: 2, width: 2, height: 2 },
    ],
    gridTemplate: '1fr 1fr / 1fr 1fr',
  },
  {
    id: 'three-top-one-bottom',
    name: 'Triple Top + Cinematic',
    description:
      'Three smaller panels on top, one large cinematic panel below for impact',
    panelCount: 4,
    mood: 'dynamic',
    panels: [
      { x: 0, y: 0, width: 1.33, height: 1.5 },
      { x: 1.33, y: 0, width: 1.33, height: 1.5 },
      { x: 2.66, y: 0, width: 1.34, height: 1.5 },
      { x: 0, y: 1.5, width: 4, height: 2.5 },
    ],
    gridTemplate: '1fr 2fr / 1fr 1fr 1fr',
  },
  {
    id: 'dominant-supporting',
    name: 'Dominant + Three Supporting',
    description:
      'One large panel (60%) taking focus with three smaller supporting panels',
    panelCount: 4,
    mood: 'dramatic',
    panels: [
      { x: 0, y: 0, width: 3, height: 3 },
      { x: 3, y: 0, width: 1, height: 1.5 },
      { x: 3, y: 1.5, width: 1, height: 1.5 },
      { x: 0, y: 3, width: 4, height: 1 },
    ],
    gridTemplate: '1fr 1fr 1fr / 1fr 1fr 1fr 1fr',
  },
  {
    id: 'staggered-action',
    name: 'Staggered Action',
    description:
      'Stair-step layout for fast-paced action sequences with visual momentum',
    panelCount: 4,
    mood: 'dynamic',
    panels: [
      { x: 0, y: 0, width: 2, height: 1.5 },
      { x: 2, y: 0.75, width: 2, height: 1.5 },
      { x: 0, y: 2.25, width: 2, height: 1.5 },
      { x: 2, y: 3, width: 2, height: 1 },
    ],
    gridTemplate: '1fr 1fr / 1fr 1fr',
  },
  {
    id: 'horizontal-tiers',
    name: 'Horizontal Tiers',
    description:
      'Full-width top panel with three varying panels below for rhythm',
    panelCount: 4,
    mood: 'balanced',
    panels: [
      { x: 0, y: 0, width: 4, height: 1.5 },
      { x: 0, y: 1.5, width: 1.5, height: 2.5 },
      { x: 1.5, y: 1.5, width: 1, height: 2.5 },
      { x: 2.5, y: 1.5, width: 1.5, height: 2.5 },
    ],
    gridTemplate: '1fr 1fr 1fr / 1fr 1fr 1fr 1fr',
  },
];

export const ALL_LAYOUTS: Record<1 | 2 | 3 | 4, LayoutTemplate[]> = {
  1: LAYOUTS_1_PANEL,
  2: LAYOUTS_2_PANELS,
  3: LAYOUTS_3_PANELS,
  4: LAYOUTS_4_PANELS,
};

/**
 * Default fallback layout used when a project's `selectedLayout` is
 * missing or refers to an id no longer present in the catalog (legacy
 * free-form strings from before this package existed, deleted templates,
 * etc.). Returns the first template in the bucket matching the project's
 * actual panel count so the rendered geometry doesn't lie about how
 * many cells the page should have — picking a fixed 4-panel template for
 * a 2-panel project would silently leave two empty cells in the
 * composed page.
 *
 * Panel counts outside the supported `1..4` range get clamped to the
 * nearest bound, so callers can pass an unvalidated number from a
 * domain entity without an extra guard.
 */
export function getDefaultFallbackLayout(panelCount: number): LayoutTemplate {
  const clamped = Math.min(4, Math.max(1, Math.trunc(panelCount))) as
    | 1
    | 2
    | 3
    | 4;
  return ALL_LAYOUTS[clamped][0]!;
}

/**
 * Get all layout templates for a given panel count.
 */
export function getLayoutsForPanelCount(
  panelCount: 1 | 2 | 3 | 4
): LayoutTemplate[] {
  return ALL_LAYOUTS[panelCount] ?? [];
}

/**
 * Get a specific layout template by ID.
 */
export function getLayoutById(id: string): LayoutTemplate | undefined {
  for (const layouts of Object.values(ALL_LAYOUTS)) {
    const layout = layouts.find((l) => l.id === id);
    if (layout) return layout;
  }
  return undefined;
}
