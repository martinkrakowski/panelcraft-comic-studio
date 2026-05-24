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
import { NotFoundError, ValidationError, LoggerPort } from '@panelcraft/shared';

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
    // Validate and create value objects
    const promptResult = ComicTitle.create(options.prompt);
    if (!promptResult.success) {
      throw new ValidationError(
        promptResult.error?.message || 'Invalid prompt',
        'prompt',
        options.prompt
      );
    }

    const panelCountResult = PanelCount.create(options.panelCount);
    if (!panelCountResult.success) {
      throw new ValidationError(
        panelCountResult.error?.message || 'Invalid panel count',
        'panelCount',
        options.panelCount
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

    // Create character bible if provided
    let characterBible: CharacterBible | null = null;
    if (options.characterBible) {
      const bibleResult = CharacterBible.create(options.characterBible);
      if (!bibleResult.success) {
        throw new ValidationError(
          bibleResult.error?.message || 'Invalid character bible',
          'characterBible',
          options.characterBible
        );
      }
      characterBible = bibleResult.value!;
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
      characterBible,
      genres: options.genres,
      tones: options.tones,
      styleReferences: options.styleReferences,
      status: 'pending_creation',
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
      this.logger.warn(
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
    await this.taskQueue.add(
      'resume-comic',
      { projectId, selectedLayout },
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

  async updateProjectPaths(
    projectId: string,
    paths: { referenceImagePaths?: string[]; moodBoardImagePaths?: string[] }
  ): Promise<void> {
    const project = await this.projectRepo.load(projectId);
    if (!project) {
      throw new NotFoundError(`Project ${projectId} not found`, projectId);
    }

    if (paths.referenceImagePaths) {
      // Update character bible with reference image paths
      const bible = project.getCharacterBible();
      if (bible) {
        const characters = bible.getCharacters();
        characters.forEach((char, index) => {
          if (paths.referenceImagePaths![index]) {
            // Update character's reference image
            // Note: Character is immutable, so we need to create a new Character
            // This is a simplified approach; in practice, you'd recreate the bible
          }
        });
      }
    }

    if (paths.moodBoardImagePaths) {
      const styleRefs = project.getStyleReferences();
      if (styleRefs) {
        project.setStyleReferences({
          ...styleRefs,
          moodBoardImages: paths.moodBoardImagePaths,
        });
      }
    }

    await this.projectRepo.save(project);
  }
}
