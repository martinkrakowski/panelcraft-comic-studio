export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Json,
} from './database.types.js';

export * from './layout-templates';

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
  | 'pending_review_extend'
  // End-of-workflow AI composition pipeline. `composing` is the in-flight
  // phase while the worker renders a single bitmap of the whole page from
  // approved panels; `pending_review_final` is the HITL pause where the
  // user approves or rejects the AI-rendered composition.
  | 'composing'
  | 'pending_review_final'
  // Cover regeneration HITL pipeline. `regenerating_cover` is the
  // in-flight phase while the worker re-renders the cover bitmap;
  // `pending_review_cover` is the HITL pause where the user approves or
  // rejects the new cover.
  | 'regenerating_cover'
  | 'pending_review_cover';

/**
 * Coarse lifecycle grouping of a `ProjectStatus`. The pipeline has many
 * granular statuses; consumers (dashboard filters, summaries) routinely need
 * the four user-meaningful phases instead. Owning this mapping here — next to
 * `ProjectStatus` itself — keeps the lifecycle rule in one shared, framework-
 * agnostic place rather than duplicated across UI surfaces.
 */
export type ProjectStatusBucket =
  | 'completed'
  | 'review'
  | 'in_progress'
  | 'failed';

/**
 * Classify a granular `ProjectStatus` into its coarse lifecycle bucket:
 * `completed`, `review` (any human-review pause), `failed`, or `in_progress`
 * (any pre-terminal in-flight phase). Exhaustive over `ProjectStatus`; the
 * `default` also absorbs any future status as still-in-progress.
 */
export function projectStatusBucket(
  status: ProjectStatus
): ProjectStatusBucket {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'pending_review':
    case 'pending_review_extend':
    case 'pending_review_final':
    case 'pending_review_cover':
      return 'review';
    default:
      return 'in_progress';
  }
}

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
  composedImageUrl?: string | null;
  selectedLayout?: string | null;
  layoutOptions?: string[] | null;
  status: ProjectStatus;
  createdAt: string;
  lastReviewSubmittedAt?: string | null;
  /** True when the project is shared to all users. */
  isShared?: boolean;
  /** True when the signed-in user owns this project (can edit/delete/share). */
  isOwner?: boolean;
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

/**
 * Final-composition flavor controls how aggressively the model alters
 * approved panels when composing the final page. See
 * `ImageCompositionPort.composeFinalPage` for semantic details.
 */
export type CompositionFlavor = 'composite-true' | 'repaint';

export interface SubmitReviewInput {
  approved: boolean;
  comment?: string;
  /**
   * When rejecting at the `pending_review_final` HITL gate, forwards the
   * user's choice of composition flavor (verbatim layout vs full re-paint)
   * to the next compose-final-page run. Ignored for other review gates.
   */
  composeFlavor?: CompositionFlavor;
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
  /** True when the project is shared to all users. */
  isShared: boolean;
  /** True when the signed-in user owns this project (can edit/delete/share). */
  isOwner: boolean;
  /** Genre tags chosen in the wizard. Empty array when none were picked. */
  genres: string[];
  /** Tone tags chosen in the wizard. Empty array when none were picked. */
  tones: string[];
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
