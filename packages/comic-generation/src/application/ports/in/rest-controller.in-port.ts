import type {
  ComicProject,
  OwnerId,
  ProjectShareState,
  ProjectVisibilityRow,
} from '@panelcraft/comic-project-management';

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
    | 'failed'
    // Post-completion extend pipeline (see `panelReconfigureHandler.ts`):
    // `extending` is the in-flight phase while the worker generates a new
    // panel; `pending_review_extend` is the HITL pause between additions.
    | 'extending'
    | 'pending_review_extend'
    // End-of-workflow AI composition pipeline (see `finalCompositionHandler.ts`):
    // `composing` is the in-flight phase while the worker renders the
    // single-bitmap final page; `pending_review_final` is the HITL pause
    // where the user approves or rejects the AI composition.
    | 'composing'
    | 'pending_review_final'
    // Cover regeneration HITL pipeline (see `regenerate-cover` worker
    // job): `regenerating_cover` is the in-flight phase while the worker
    // re-renders the cover bitmap; `pending_review_cover` is the HITL
    // pause where the user approves or rejects the new cover.
    | 'regenerating_cover'
    | 'pending_review_cover';
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
  composedImageUrl?: string | null;
  selectedLayout?: string | null;
  layoutOptions?: string[] | null;
}

export interface RestControllerPort {
  /**
   * Creates a new project with wizard support and triggers the workflow.
   * @param options - Project creation options including wizard data
   * @returns The generated project ID.
   */
  createProject(
    options: {
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
    },
    /** Owning user id, persisted on the new project for ownership scoping. */
    ownerId?: OwnerId
  ): Promise<string>;

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
   * Lists all projects (unscoped).
   */
  listProjects(): Promise<ComicProject[]>;

  /**
   * Lists only the projects owned by `ownerId`.
   */
  listProjectsByOwner(ownerId: OwnerId): Promise<ComicProject[]>;

  /**
   * Returns the owning user id for a project, or null if missing/unowned.
   * Used by the API layer to authorize per-project operations.
   */
  getProjectOwnerId(id: string): Promise<string | null>;

  /**
   * Lists the projects visible to `ownerId` — their own plus all shared
   * projects — as a lightweight dashboard read-model.
   */
  listVisibleProjects(ownerId: OwnerId): Promise<ProjectVisibilityRow[]>;

  /**
   * Returns owner + sharing state for a project, or null if it doesn't exist.
   * Used to authorize viewing a (possibly shared) project.
   */
  getProjectShareState(id: string): Promise<ProjectShareState | null>;

  /** Toggle whether a project is shared to all users (owner-only at the API). */
  setProjectShared(id: string, shared: boolean): Promise<void>;

  /**
   * One-time recovery: claim every ownerless project for `ownerId` and mark it
   * shared. Returns the number of projects adopted.
   */
  adoptOrphanProjects(ownerId: OwnerId): Promise<number>;

  /**
   * Resumes the generation thread with HITL approval/rejection feedback.
   *
   * `composeFlavor` is only meaningful at the `pending_review_final` gate;
   * when set, a rejection re-enqueues `compose-final-page` with the chosen
   * flavor. It is ignored for the per-panel and extend-mode review gates.
   */
  submitReview(
    projectId: string,
    approved: boolean,
    comment?: string,
    regenerationHint?: string,
    composeFlavor?: 'composite-true' | 'repaint'
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

  /**
   * Queue the AI-rendered final composition for a completed project. Worker
   * renders a single bitmap of the page from the approved panels and pauses
   * at `pending_review_final` for HITL approval. `regenFeedback` is applied
   * to the current run only when retrying after rejection. `composeFlavor`
   * controls how aggressively the model alters approved panels: defaults to
   * `composite-true` (preserve subjects, harmonize seams) or `repaint`
   * (treat panels as style references and repaint for maximum cohesion).
   */
  composeFinalPage(
    projectId: string,
    regenFeedback?: string,
    composeFlavor?: 'composite-true' | 'repaint'
  ): Promise<void>;

  /**
   * Queue a fresh cover render for a `completed` project. Optional
   * `feedback` is appended to the cover prompt for this run only and is
   * not persisted on the project.
   */
  regenerateCover(projectId: string, feedback?: string): Promise<void>;
}
