import type { PanelJSON } from '@panelcraft/comic-project-management';

export interface ComicProjectJSON {
  id: string;
  prompt: string;
  panelCount: number;
  panels?: PanelJSON[];
  characterBible?: unknown;
  genres?: string[];
  tones?: string[];
  styleReferences?: {
    globalStylePrompt: string;
    moodBoardPreset: string;
    moodBoardImages: string[];
    artDirectionNotes?: string;
  } | null;
  coverImageUrl?: string | null;
  selectedLayout?: string | null;
  layoutOptions?: string[] | null;
  status: string;
  createdAt: string;
  lastReviewSubmittedAt?: string | null;
}
