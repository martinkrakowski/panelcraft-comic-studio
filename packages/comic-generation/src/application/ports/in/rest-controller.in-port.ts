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
   * iterate on individual frames after the HITL flow has finished.
   */
  regeneratePanel(projectId: string, panelIndex: number): Promise<void>;

  /**
   * Updates dialogue/captions overlays on a panel (editor creative mutations).
   * Persists structured data; survives regens. Gated to completed projects.
   */
  updatePanelOverlays(
    projectId: string,
    panelIndex: number,
    updates: { dialogue?: unknown[]; captions?: unknown[] }
  ): Promise<void>;

  /**
   * Updates the short display title (post title-LLM or manual edit in overlays editor).
   */
  updateDisplayTitle(projectId: string, title: string | null): Promise<void>;
}
