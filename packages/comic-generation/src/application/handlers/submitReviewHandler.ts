import { FeedbackEntry } from '@panelcraft/comic-project-management';
import { NotFoundError, ValidationError, LoggerPort } from '@panelcraft/shared';
import type { RelationalDbPort } from '../ports/out/relational-db.out-port.js';
import type { JobQueuePort } from '../ports/out/job-queue.out-port.js';

const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;

interface SubmitReviewDeps {
  projectRepo: RelationalDbPort;
  taskQueue: JobQueuePort;
  logger: LoggerPort;
}

export async function submitReview(
  projectId: string,
  approved: boolean,
  comment: string | undefined,
  regenerationHint: string | undefined,
  deps: SubmitReviewDeps
): Promise<void> {
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

  const project = await deps.projectRepo.load(projectId);
  if (!project) {
    throw new NotFoundError(`Project ${projectId} not found`, projectId);
  }

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

  if (isStuckProcessing) {
    deps.logger.warn(
      `[Recovery] Project ${projectId} was stuck in "processing" for ` +
        `${Math.round((Date.now() - new Date(project.getLastReviewSubmittedAt()!).getTime()) / 1000)}s. ` +
        `Allowing retry.`
    );
  }

  project.setStatus('processing');
  project.setLastReviewSubmittedAt(new Date().toISOString());
  await deps.projectRepo.save(project);

  await deps.taskQueue.add(
    'resume-comic',
    { projectId, feedback: feedbackResult.value!.getValue() },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
    }
  );
}

interface EnqueueResumeDeps {
  taskQueue: JobQueuePort;
}

export async function enqueueResumeComic(
  projectId: string,
  selectedLayout: string,
  deps: EnqueueResumeDeps
): Promise<void> {
  await deps.taskQueue.add(
    'resume-comic',
    { projectId, selectedLayout },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
    }
  );
}
