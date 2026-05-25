import { RestControllerPort } from '../ports/in/rest-controller.in-port.js';
import type { RelationalDbPort } from '../ports/out/relational-db.out-port.js';
import type { JobQueuePort } from '../ports/out/job-queue.out-port.js';
import { ComicProject } from '@panelcraft/comic-project-management';
import { NotFoundError, LoggerPort } from '@panelcraft/shared';
import { createProject } from '../handlers/createProjectHandler.js';
import {
  submitReview,
  enqueueResumeComic,
} from '../handlers/submitReviewHandler.js';
import { updateProjectPaths } from '../handlers/updateProjectPathsHandler.js';

/**
 * Application use case for comic generation workflow orchestration.
 * Implements the RestControllerPort and coordinates project management
 * with background job queue execution of the LangGraph workflow.
 */
export class ComicGenerationUseCase implements RestControllerPort {
  constructor(
    private readonly projectRepo: RelationalDbPort,
    private readonly taskQueue: JobQueuePort,
    private readonly logger: LoggerPort
  ) {}

  async createProject(options: {
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
  }): Promise<string> {
    return createProject(options, {
      projectRepo: this.projectRepo,
      taskQueue: this.taskQueue,
    });
  }

  async getProject(id: string): Promise<ComicProject> {
    const project = await this.projectRepo.load(id);
    if (!project) {
      throw new NotFoundError(`Project with id ${id} not found`, id);
    }
    return project;
  }

  async listProjects(): Promise<ComicProject[]> {
    return this.projectRepo.listAll();
  }

  async submitReview(
    projectId: string,
    approved: boolean,
    comment?: string,
    regenerationHint?: string
  ): Promise<void> {
    return submitReview(projectId, approved, comment, regenerationHint, {
      projectRepo: this.projectRepo,
      taskQueue: this.taskQueue,
      logger: this.logger,
    });
  }

  async selectLayout(projectId: string, selectedLayout: string): Promise<void> {
    const project = await this.projectRepo.load(projectId);
    if (!project) {
      throw new NotFoundError(`Project ${projectId} not found`, projectId);
    }
    project.setSelectedLayout(selectedLayout);
    project.setStatus('pending_review');
    await this.projectRepo.save(project);
  }

  async enqueueResumeComic(
    projectId: string,
    selectedLayout: string
  ): Promise<void> {
    return enqueueResumeComic(projectId, selectedLayout, {
      taskQueue: this.taskQueue,
    });
  }

  async updateProjectPaths(
    projectId: string,
    paths: { referenceImagePaths?: string[]; moodBoardImagePaths?: string[] }
  ): Promise<void> {
    return updateProjectPaths(projectId, paths, {
      projectRepo: this.projectRepo,
    });
  }
}
