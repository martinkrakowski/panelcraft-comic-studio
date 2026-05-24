/**
 * Constants for Onboarding Wizard
 * Centralized to avoid duplication and enable easy updates
 */

export const GENRE_OPTIONS = [
  'Action',
  'Adventure',
  'Fantasy',
  'Sci-Fi',
  'Noir',
  'Mystery',
  'Horror',
  'Comedy',
  'Drama',
  'Cyberpunk',
  'Superhero',
] as const;

export type GenreType = (typeof GENRE_OPTIONS)[number];

export const TONE_OPTIONS = [
  'Dark',
  'Suspenseful',
  'Lighthearted',
  'Dramatic',
  'Gritty',
  'Whimsical',
  'Epic',
  'Cinematic',
] as const;

export type ToneType = (typeof TONE_OPTIONS)[number];

export interface StylePreset {
  id: string;
  label: string;
  preview: string;
}

export const STYLE_PRESETS: StylePreset[] = [
  { id: 'noir', label: 'Noir', preview: '/previews/noir.jpg' },
  { id: 'anime', label: 'Anime', preview: '/previews/anime.jpg' },
  { id: 'cyberpunk', label: 'Cyberpunk', preview: '/previews/cyberpunk.jpg' },
  {
    id: 'watercolor',
    label: 'Watercolor',
    preview: '/previews/watercolor.jpg',
  },
  { id: 'retro-comic', label: 'Retro Comic', preview: '/previews/retro.jpg' },
  { id: 'charcoal', label: 'Charcoal', preview: '/previews/charcoal.jpg' },
];

export const STEP_LABELS = [
  'Story',
  'Characters',
  'Style',
  'Review',
  'Layout',
] as const;

export const MAX_PANEL_COUNT = 4; // Limited to minimize token burn on demo

export const PANEL_PREVIEW_LAYOUTS = [[1], [1, 1], [1, 1, 1], [2, 1]] as const;
