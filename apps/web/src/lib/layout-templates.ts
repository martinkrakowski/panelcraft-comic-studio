/**
 * Layout template re-exports + wizard-specific helpers.
 *
 * The canonical layout geometry (interfaces and data) lives in
 * `@panelcraft/types` so the backend worker can compose pages without
 * importing from the frontend. This file re-exports those types for
 * legacy consumers and adds the wizard's genre/tone → mood matching.
 */

export type { PanelRect, LayoutTemplate, LayoutMood } from '@panelcraft/types';

export {
  LAYOUTS_1_PANEL,
  LAYOUTS_2_PANELS,
  LAYOUTS_3_PANELS,
  LAYOUTS_4_PANELS,
  ALL_LAYOUTS,
  getLayoutsForPanelCount,
  getLayoutById,
} from '@panelcraft/types';

import {
  getLayoutsForPanelCount,
  type LayoutTemplate,
} from '@panelcraft/types';
import type { GenreType, ToneType } from './wizard-constants';

const GENRE_MOOD_MAP: Record<
  GenreType,
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
  ToneType,
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
        const matchingMoods = GENRE_MOOD_MAP[genre as GenreType];
        if (matchingMoods) {
          const index = matchingMoods.indexOf(layout.mood);
          if (index !== -1) {
            score += index === 0 ? 3 : 1;
          }
        }
      });

      if (tones) {
        tones.forEach((tone) => {
          const matchingMoods = TONE_MOOD_MAP[tone as ToneType];
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
