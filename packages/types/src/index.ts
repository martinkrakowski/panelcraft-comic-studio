export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Json,
} from './database.types.js';

// Re-export centralized overlay types from the shared kernel
// so consumers of @panelcraft/types continue to work without changes.
export type {
  NormalizedPoint,
  DialogueEntry,
  CaptionEntry,
} from '@panelcraft/shared';

// Import for use within this file (re-exports don't automatically bring names into scope for the module body)
import type { DialogueEntry, CaptionEntry } from '@panelcraft/shared';

export interface CharacterValue {
  name: string;
  role: string;
  visual: string;
  traits?: string;
  consistency: string;
}

export interface CharacterBibleValue {
  characters: CharacterValue[];
}

export type PanelStatus = 'pending' | 'generated' | 'completed' | 'failed';

export type ProjectStatus =
  | 'created'
  | 'pending_creation'
  | 'processing'
  | 'pending_layout'
  | 'pending_review'
  | 'completed'
  | 'failed';

export interface PanelDTO {
  id: string;
  index: number;
  status: PanelStatus;
  prompt: string;
  imageUrl: string | null;
  /**
   * Dialogue overlays (bubbles) for this panel. Optional; empty or omitted means no bubbles.
   * These are the source of truth for editor and export; survive panel regeneration.
   */
  dialogue?: DialogueEntry[];
  /**
   * Caption overlays for this panel. Optional.
   */
  captions?: CaptionEntry[];
}

export interface ComicProjectDTO {
  id: string;
  prompt: string;
  /** Optional short display / cover title (punchy, for UI and overlays). Populated after initial creation or via edit. */
  displayTitle?: string | null;
  panelCount: number;
  panels: PanelDTO[];
  characterBible: CharacterBibleValue | null;
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
  status: ProjectStatus;
  createdAt: string;
  lastReviewSubmittedAt?: string | null;
}

export interface CreateProjectInput {
  prompt: string;
  panelCount: number;
  genres?: string[];
  tones?: string[];
  characterBible?: CharacterBibleValue | null;
  styleReferences?: {
    globalStylePrompt: string;
    moodBoardPreset: string;
    moodBoardImages: string[];
    artDirectionNotes?: string;
  } | null;
  referenceImages?: string[]; // Relative paths to Supabase Storage
  /** Optional initial display title (rarely provided at create; usually derived later). */
  displayTitle?: string | null;
}

export interface SubmitReviewInput {
  approved: boolean;
  comment?: string;
}

/**
 * Standard API response envelope wrapping all server response payloads.
 * Represents success status, typed data, and optional structured error details.
 */
export type ResponseEnvelope<T> =
  | {
      success: true;
      data: T;
      error?: never;
    }
  | {
      success: false;
      data?: never;
      error: {
        code: string;
        message: string;
      };
    };

export interface ProjectSummaryDTO {
  id: string;
  prompt: string;
  /** Short display title if set (preferred for cards over truncated prompt). */
  displayTitle?: string | null;
  panelCount: number;
  status: ProjectStatus;
  createdAt: string;
}

export interface ProjectListResponse {
  projects: ProjectSummaryDTO[];
}

export interface ProjectDetailResponse {
  project: ComicProjectDTO;
}

export interface CreateProjectResponse {
  projectId: string;
  status: ProjectStatus;
}

export interface ReviewResponse {
  message: string;
}
