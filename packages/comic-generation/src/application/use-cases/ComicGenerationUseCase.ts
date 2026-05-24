import { RestControllerPort } from '../ports/in/rest-controller.in-port.js';
import type { RelationalDbPort } from '../ports/out/relational-db.out-port.js';
import type { JobQueuePort } from '../ports/out/job-queue.out-port.js';
import { ComicProject, Panel } from '@panelcraft/comic-project-management';
import {
  ComicProjectId,
  ComicTitle,
  PanelCount,
  PanelId,
  PanelStatus,
  FeedbackEntry,
} from '@panelcraft/comic-project-management';
import { randomUUID } from 'node:crypto';
import { NotFoundError, ValidationError } from '@panelcraft/shared';

/**
 * Application use case for comic generation workflow orchestration.
 * Implements the RestControllerPort and coordinates project management
 * with background job queue execution of the LangGraph workflow.
 */
export class ComicGenerationUseCase implements RestControllerPort {
  constructor(
    private readonly projectRepo: RelationalDbPort,
    private readonly taskQueue: JobQueuePort
  ) {}

  async createProject(prompt: string, panelCount: number): Promise<string> {
    // Validate and create value objects
    const promptResult = ComicTitle.create(prompt);
    if (!promptResult.success) {
      throw new ValidationError(
        promptResult.error?.message || 'Invalid prompt',
        'prompt',
        prompt
      );
    }

    const panelCountResult = PanelCount.create(panelCount);
    if (!panelCountResult.success) {
      throw new ValidationError(
        panelCountResult.error?.message || 'Invalid panel count',
        'panelCount',
        panelCount
      );
    }

    const projectId = randomUUID();
    const projectIdResult = ComicProjectId.create(projectId);
    if (!projectIdResult.success) {
      throw new ValidationError(
        projectIdResult.error?.message || 'Invalid project ID',
        'projectId',
        projectId
      );
    }

    // Create panels with PanelId and PanelStatus value objects
    const panels: Panel[] = Array.from(
      { length: panelCountResult.value!.getValue() },
      (_, i) => {
        const panelIdResult = PanelId.create(`panel-${i}`);
        if (!panelIdResult.success) {
          throw new ValidationError(
            panelIdResult.error?.message || 'Invalid panel ID',
            'panelId',
            `panel-${i}`
          );
        }

        const statusResult = PanelStatus.create('pending');
        if (!statusResult.success) {
          throw new ValidationError(
            statusResult.error?.message || 'Invalid panel status',
            'status',
            'pending'
          );
        }

        return new Panel(panelIdResult.value!, {
          prompt: '',
          status: statusResult.value!,
          generatedImageUrl: null,
        });
      }
    );

    // Create and persist project domain entity
    const project = new ComicProject(projectIdResult.value!, {
      prompt: promptResult.value!,
      panelCount: panelCountResult.value!,
      panels,
      characterBible: null,
      status: 'created',
      createdAt: new Date().toISOString(),
    });

    await this.projectRepo.save(project);

    // Dispatch job to background worker queue for async generation
    await this.taskQueue.add(
      'start-comic',
      { projectId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      }
    );

    return projectId;
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
    // Validate feedback entry
    const feedbackResult = FeedbackEntry.create({
      approved,
      comment,
      regenerationHint,
    });
    if (!feedbackResult.success) {
      throw new ValidationError(
        feedbackResult.error?.message || 'Invalid feedback',
        'feedback',
        { approved, comment, regenerationHint }
      );
    }

    // Verify project exists
    const project = await this.projectRepo.load(projectId);
    if (!project) {
      throw new NotFoundError(`Project ${projectId} not found`, projectId);
    }

    // Check if project is in a reviewable state
    const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minute timeout for recovery
    const isStuckProcessing =
      project.getStatus() === 'processing' &&
      project.getLastReviewSubmittedAt() &&
      Date.now() - new Date(project.getLastReviewSubmittedAt()!).getTime() >
        PROCESSING_TIMEOUT_MS;

    if (project.getStatus() !== 'pending_review' && !isStuckProcessing) {
      throw new ValidationError(
        `Cannot submit review for project in status "${project.getStatus()}". ` +
          `Project must be in "pending_review" status.`,
        'status',
        project.getStatus()
      );
    }

    // If recovering from stuck state, log it
    if (isStuckProcessing) {
      console.warn(
        `[Recovery] Project ${projectId} was stuck in "processing" for ` +
          `${Math.round((Date.now() - new Date(project.getLastReviewSubmittedAt()!).getTime()) / 1000)}s. ` +
          `Allowing retry.`
      );
    }

    // Prevent duplicate submissions by marking project as "processing" synchronously
    // Store timestamp for recovery detection if job fails
    project.setStatus('processing');
    project.setLastReviewSubmittedAt(new Date().toISOString());
    await this.projectRepo.save(project);

    // Dispatch resumption job containing the human feedback
    await this.taskQueue.add(
      'resume-comic',
      {
        projectId,
        feedback: feedbackResult.value!.getValue(),
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      }
    );
  }
}
