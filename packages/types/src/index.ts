export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Json,
} from './database.types.js';

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
  | 'failed'
  // Post-completion extend pipeline. `extending` is the in-flight phase
  // while the worker generates a freshly-added panel; `pending_review_extend`
  // is the HITL pause between extension panels.
  | 'extending'
  | 'pending_review_extend';

export interface PanelDTO {
  id: string;
  index: number;
  status: PanelStatus;
  prompt: string;
  imageUrl: string | null;
}

export interface ComicProjectDTO {
  id: string;
  prompt: string;
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
  panelCount: number;
  status: ProjectStatus;
  createdAt: string;
  /**
   * Short-lived signed URL to the cover image, when one exists. The list
   * endpoint signs these in parallel; failed signs surface as `null` so the
   * dashboard can render a placeholder rather than break the row.
   */
  coverImageUrl?: string | null;
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
