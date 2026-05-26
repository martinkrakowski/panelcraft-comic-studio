import type { ComicProject } from '@panelcraft/comic-project-management';

/**
 * Project data structure returned by REST endpoints.
 */
export interface ProjectData {
  id: string;
  prompt: string;
  panelCount: number;
  status:
    | 'created'
    | 'processing'
    | 'pending_creation'
    | 'pending_review'
    | 'pending_layout'
    | 'completed'
    | 'failed';
  createdAt: string;
  panels?: Array<{
    id: string;
    index: number;
    status: string;
    imageUrl: string | null;
  }>;
  characterBible?: unknown;
  // Wizard-specific fields
  genres?: string[];
  tones?: string[];
  styleReferences?: {
    globalStylePrompt: string;
    moodBoardPreset: string;
    moodBoardImages: string[];
    artDirectionNotes?: string;
  };
  coverImageUrl?: string | null;
  selectedLayout?: string | null;
  layoutOptions?: string[] | null;
}

export interface RestControllerPort {
  /**
   * Creates a new project with wizard support and triggers the workflow.
   * @param options - Project creation options including wizard data
   * @returns The generated project ID.
   */
  createProject(options: {
    prompt: string;
    panelCount: number;
    genres?: string[];
    tones?: string[];
    characterBible?: Record<string, unknown>;
    styleReferences?: {
      globalStylePrompt: string;
      moodBoardPreset: string;
      moodBoardImages: string[];
      artDirectionNotes?: string;
    };
    referenceImagePaths?: string[];
  }): Promise<string>;

  /**
   * Queues the comic generation workflow for a previously-created project.
   * Call after createProject + any required file uploads have succeeded.
   */
  startComicGeneration(projectId: string): Promise<void>;

  /**
   * Retrieves the current project status and panel list.
   * Throws NotFoundError if project does not exist.
   */
  getProject(id: string): Promise<ComicProject>;

  /**
   * Lists all projects.
   */
  listProjects(): Promise<ComicProject[]>;

  /**
   * Resumes the generation thread with HITL approval/rejection feedback.
   */
  submitReview(
    projectId: string,
    approved: boolean,
    comment?: string,
    regenerationHint?: string
  ): Promise<void>;

  /**
   * Selects a layout for the project and updates status.
   */
  selectLayout(projectId: string, selectedLayout: string): Promise<void>;

  /**
   * Persist a new layout choice without touching workflow state. Used for
   * post-generation layout swaps where the layout only affects rendering of
   * existing panels (no resume job, no regeneration).
   */
  updateSelectedLayout(
    projectId: string,
    selectedLayout: string
  ): Promise<void>;

  /**
   * Enqueues a resume-comic job with the selected layout.
   */
  enqueueResumeComic(projectId: string, selectedLayout: string): Promise<void>;

  /**
   * Updates project with file paths after upload.
   */
  updateProjectPaths(
    projectId: string,
    paths: { referenceImagePaths?: string[]; moodBoardImagePaths?: string[] }
  ): Promise<void>;

  /**
   * Marks a single panel as pending and enqueues a regeneration job. Allowed
   * once the project is `completed` or `pending_review` so the user can
   * iterate on individual frames after the HITL flow has finished. Optional
   * `feedback` is forwarded to the worker, which appends it to the panel
   * prompt for this regeneration only (not persisted on the panel).
   */
  regeneratePanel(
    projectId: string,
    panelIndex: number,
    feedback?: string
  ): Promise<void>;

  /**
   * Add empty panel slots to a completed project and kick off the worker
   * that fills them in one-by-one, pausing for HITL review on each new
   * panel. Bypasses the LangGraph workflow (which has already terminated
   * for the original generation).
   */
  extendPanels(
    projectId: string,
    targetPanelCount: number,
    selectedLayout: string
  ): Promise<void>;

  /**
   * Drop panels from a completed project, keeping only the indices the user
   * picked. Metadata-only operation — no regeneration, no jobs enqueued.
   */
  shrinkPanels(
    projectId: string,
    keepIndices: number[],
    selectedLayout: string
  ): Promise<void>;
}
