/**
 * Constants for Onboarding Wizard
 * Centralized to avoid duplication and enable easy updates
 */

export const GENRE_OPTIONS = [
  'Action',
  'Noir',
  'Fantasy',
  'Comedy',
  'Cozy',
  'Cyberpunk',
  'Mystery',
  'Romance',
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
  'Intimate',
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

export const PANEL_PREVIEW_LAYOUTS = [
  [1],
  [1, 1],
  [1, 1, 1],
  [2, 1],
  [1, 2],
  [2, 2],
] as const;
