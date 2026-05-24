import type { ComicProject } from '@panelcraft/comic-project-management';

/**
 * Project data structure returned by REST endpoints.
 */
export interface ProjectData {
  id: string;
  prompt: string;
  panelCount: number;
  status: 'created' | 'processing' | 'pending_review' | 'completed' | 'failed';
  createdAt: string;
  panels?: Array<{
    id: string;
    index: number;
    status: string;
    imageUrl: string | null;
  }>;
  characterBible?: unknown;
}

export interface RestControllerPort {
  /**
   * Creates a new project and triggers the story structure, character bible generation,
   * and the first panel generation.
   * Runs the workflow asynchronously.
   *
   * @returns The generated project ID.
   */
  createProject(prompt: string, panelCount: number): Promise<string>;

  /**
   * Retrieves the current project status and panel list.
   */
  getProject(id: string): Promise<ComicProject | null>;

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
}
