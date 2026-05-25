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
  mood: 'dramatic' | 'balanced' | 'dynamic';
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

const GENRE_MOOD_MAP: Record<
  string,
  Array<'dramatic' | 'balanced' | 'dynamic'>
> = {
  Action: ['dynamic', 'dramatic'],
  Adventure: ['dynamic', 'balanced'],
  Fantasy: ['dynamic', 'balanced'],
  'Sci-Fi': ['dynamic', 'balanced'],
  Noir: ['dramatic'],
  Mystery: ['balanced', 'dramatic'],
  Horror: ['dramatic'],
  Comedy: ['balanced'],
  Drama: ['balanced', 'dramatic'],
  Cyberpunk: ['dynamic', 'dramatic'],
  Superhero: ['dynamic', 'dramatic'],
};

const TONE_MOOD_MAP: Record<
  string,
  Array<'dramatic' | 'balanced' | 'dynamic'>
> = {
  Dark: ['dramatic'],
  Suspenseful: ['dramatic', 'dynamic'],
  Lighthearted: ['balanced'],
  Dramatic: ['dramatic', 'balanced'],
  Gritty: ['dramatic', 'dynamic'],
  Whimsical: ['balanced'],
  Epic: ['dramatic', 'dynamic'],
  Cinematic: ['dramatic', 'dynamic'],
};

/**
 * Get recommended layouts by matching genres/tones to layout moods, or filtering by a single mood.
 */
export function getLayoutsByMood(
  panelCount: 1 | 2 | 3 | 4,
  moodOrGenres?: 'dramatic' | 'balanced' | 'dynamic' | string[],
  tones?: string[]
): LayoutTemplate[] {
  const layouts = getLayoutsForPanelCount(panelCount);

  if (typeof moodOrGenres === 'string') {
    const mood = moodOrGenres as 'dramatic' | 'balanced' | 'dynamic';
    return layouts.filter((layout) => layout.mood === mood);
  }

  const genres = Array.isArray(moodOrGenres) ? moodOrGenres : [];
  if (genres.length === 0 && (!tones || tones.length === 0)) {
    return layouts;
  }

  return layouts
    .map((layout) => {
      let score = 0;

      genres.forEach((genre) => {
        const matchingMoods = GENRE_MOOD_MAP[genre];
        if (matchingMoods) {
          const index = matchingMoods.indexOf(layout.mood);
          if (index !== -1) {
            score += index === 0 ? 3 : 1;
          }
        }
      });

      if (tones) {
        tones.forEach((tone) => {
          const matchingMoods = TONE_MOOD_MAP[tone];
          if (matchingMoods) {
            const index = matchingMoods.indexOf(layout.mood);
            if (index !== -1) {
              score += index === 0 ? 3 : 1;
            }
          }
        });
      }

      return { layout, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.layout);
}
