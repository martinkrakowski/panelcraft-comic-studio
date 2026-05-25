/**
 * Smart Dynamic Panel Layouts (1-4 panels)
 * Professional, story-aware comic page layouts with variable panel sizes
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
  mood: 'dramatic' | 'balanced' | 'dynamic' | 'intimate';
}

export {
  LAYOUTS_1_PANEL,
  LAYOUTS_2_PANELS,
  LAYOUTS_3_PANELS,
  LAYOUTS_4_PANELS,
  ALL_LAYOUTS,
} from './layout-templates-data';

import { ALL_LAYOUTS } from './layout-templates-data';

/**
 * Get all layout templates for a given panel count
 */
export function getLayoutsForPanelCount(
  panelCount: 1 | 2 | 3 | 4
): LayoutTemplate[] {
  return (ALL_LAYOUTS[panelCount] as LayoutTemplate[]) || [];
}

/**
 * Get a specific layout template by ID
 */
export function getLayoutById(id: string): LayoutTemplate | undefined {
  for (const layouts of Object.values(ALL_LAYOUTS)) {
    const layout = (layouts as LayoutTemplate[]).find((l) => l.id === id);
    if (layout) return layout;
  }
  return undefined;
}

/**
 * Get recommended layouts by mood/story context
 */
export function getLayoutsByMood(
  panelCount: 1 | 2 | 3 | 4,
  mood: 'dramatic' | 'balanced' | 'dynamic' | 'intimate'
): LayoutTemplate[] {
  return getLayoutsForPanelCount(panelCount).filter(
    (layout) => layout.mood === mood
  );
}
