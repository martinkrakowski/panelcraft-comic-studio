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
  getProject(id: string): Promise<any>;

  /**
   * Lists all projects.
   */
  listProjects(): Promise<any[]>;

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

