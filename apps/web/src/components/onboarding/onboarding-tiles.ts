import { Lightbulb, LayoutTemplate, FolderOpen } from 'lucide-react';

export type StartingMethod = 'brainstorm' | 'template' | 'load-existing';

export interface TileAccent {
  r: number;
  g: number;
  b: number;
}

/** One tile in the starting-method grid. */
export interface TileConfig {
  id: StartingMethod;
  label: string;
  badgeLabel: string;
  Icon: React.ComponentType<{ className?: string; size?: number }>;
  accent: TileAccent;
}

export const TILES: TileConfig[] = [
  {
    id: 'brainstorm',
    label: 'Brainstorm an Idea',
    badgeLabel: 'AI-Assisted',
    Icon: Lightbulb,
    accent: { r: 139, g: 92, b: 246 },
  },
  {
    id: 'template',
    label: 'Choose a Template',
    badgeLabel: 'Quick Start',
    Icon: LayoutTemplate,
    accent: { r: 6, g: 182, b: 212 },
  },
  {
    id: 'load-existing',
    label: 'Load Existing Project',
    badgeLabel: 'Continue',
    Icon: FolderOpen,
    accent: { r: 236, g: 72, b: 153 },
  },
];

export const ROUTE_MAP: Record<StartingMethod, string> = {
  brainstorm: '/new/brainstorm',
  template: '/new/template',
  'load-existing': '/',
};
