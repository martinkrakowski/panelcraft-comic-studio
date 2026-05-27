import {
  FeedbackEntry,
  PanelStatus,
} from '@panelcraft/comic-project-management';
import { NotFoundError, ValidationError, LoggerPort } from '@panelcraft/shared';
import type { RelationalDbPort } from '../ports/out/relational-db.out-port.js';
import type { JobQueuePort } from '../ports/out/job-queue.out-port.js';
import {
  PENDING_REVIEW_EXTEND_STATUS,
  EXTENDING_STATUS,
} from './panelReconfigureHandler.js';

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

  const currentStatus = project.getStatus();
  const isExtendReview = currentStatus === PENDING_REVIEW_EXTEND_STATUS;
  const isStuckProcessing =
    currentStatus === 'processing' &&
    project.getLastReviewSubmittedAt() &&
    Date.now() - new Date(project.getLastReviewSubmittedAt()!).getTime() >
      PROCESSING_TIMEOUT_MS;

  if (
    currentStatus !== 'pending_review' &&
    !isExtendReview &&
    !isStuckProcessing
  ) {
    throw new ValidationError(
      `Cannot submit review for project in status "${currentStatus}". ` +
        `Project must be in "pending_review" or "${PENDING_REVIEW_EXTEND_STATUS}" status.`,
      'status',
      currentStatus
    );
  }

  if (isStuckProcessing) {
    deps.logger.warn(
      `[Recovery] Project ${projectId} was stuck in "processing" for ` +
        `${Math.round((Date.now() - new Date(project.getLastReviewSubmittedAt()!).getTime()) / 1000)}s. ` +
        `Allowing retry.`
    );
  }

  // Extend mode bypasses LangGraph. Each approval marks the freshly-generated
  // extension panel as completed and either kicks off the worker for the next
  // pending slot or settles the project back to `completed`. Rejection routes
  // through the same extend-next-panel job with the feedback attached so the
  // worker regenerates that panel before pausing for review again.
  if (isExtendReview) {
    const panels = project.getPanels();
    const generatedIndex = panels.findIndex(
      (p) => p.getStatus().getValue() === 'generated'
    );
    if (generatedIndex === -1) {
      throw new ValidationError(
        `Extend-mode review submitted but no 'generated' panel found on ` +
          `project ${projectId}.`,
        'panels',
        panels.map((p) => p.getStatus().getValue())
      );
    }

    const feedbackValue = feedbackResult.value!.getValue();
    if (feedbackValue.approved) {
      const completedStatus = PanelStatus.create('completed');
      if (!completedStatus.success || !completedStatus.value) {
        throw new ValidationError('Failed to construct completed PanelStatus');
      }
      panels[generatedIndex]!.setStatus(completedStatus.value);
      project.setPanels(panels);

      const hasMorePending = panels.some(
        (p) => p.getStatus().getValue() === 'pending'
      );
      if (hasMorePending) {
        project.setStatus(EXTENDING_STATUS);
        project.setLastReviewSubmittedAt(new Date().toISOString());
        await deps.projectRepo.save(project);
        await deps.taskQueue.add(
          'extend-next-panel',
          { projectId },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: true,
          }
        );
      } else {
        project.setStatus('completed');
        project.setLastReviewSubmittedAt(new Date().toISOString());
        await deps.projectRepo.save(project);
      }
      return;
    }

    // Rejected with feedback — regenerate the same panel under the user's
    // notes. The worker reads `regenFeedback` and appends it to the prompt
    // for this regeneration only.
    const pendingStatus = PanelStatus.create('pending');
    if (!pendingStatus.success || !pendingStatus.value) {
      throw new ValidationError('Failed to construct pending PanelStatus');
    }
    panels[generatedIndex]!.setStatus(pendingStatus.value);
    project.setPanels(panels);
    project.setStatus(EXTENDING_STATUS);
    project.setLastReviewSubmittedAt(new Date().toISOString());
    await deps.projectRepo.save(project);

    await deps.taskQueue.add(
      'extend-next-panel',
      {
        projectId,
        regenFeedback:
          feedbackValue.comment || feedbackValue.regenerationHint || undefined,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      }
    );
    return;
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

interface RegeneratePanelDeps {
  projectRepo: RelationalDbPort;
  taskQueue: JobQueuePort;
  logger: LoggerPort;
}

/**
 * Marks a single panel as pending and enqueues a regenerate-panel job. Unlike
 * submitReview (which only operates on the panel currently up for HITL
 * review), this can target any panel in a completed comic so the user can
 * iterate on individual frames after the fact.
 */
export async function regeneratePanel(
  projectId: string,
  panelIndex: number,
  feedback: string | undefined,
  deps: RegeneratePanelDeps
): Promise<void> {
  const project = await deps.projectRepo.load(projectId);
  if (!project) {
    throw new NotFoundError(`Project ${projectId} not found`, projectId);
  }

  const panels = project.getPanels();
  if (panelIndex < 0 || panelIndex >= panels.length) {
    throw new ValidationError(
      `Panel index ${panelIndex} out of range (project has ${panels.length} panels)`,
      'panelIndex',
      panelIndex
    );
  }

  const status = project.getStatus();
  // Limit to 'completed' projects. While pending_review the LangGraph thread
  // still owns panel state via its checkpoint; mutating panels outside the
  // graph would diverge the next Command(resume) from reality.
  if (status !== 'completed') {
    throw new ValidationError(
      `Cannot regenerate panel while project is "${status}" — only ` +
        `completed projects accept regeneration requests.`,
      'status',
      status
    );
  }

  // Capture the original panel status + project status so we can roll back
  // if enqueue fails after we've already persisted the "processing" mutation.
  const originalPanelStatus = panels[panelIndex]!.getStatus();
  const originalProjectStatus = status;

  // Flip the target panel back to pending so the worker (and any UI polling)
  // can see that this panel is being reworked, then mark the project itself
  // as processing so the UI's polling loop stays active.
  const pendingStatus = PanelStatus.create('pending');
  if (!pendingStatus.success || !pendingStatus.value) {
    throw new ValidationError('Failed to construct pending PanelStatus');
  }
  panels[panelIndex]!.setStatus(pendingStatus.value);
  project.setPanels(panels);
  project.setStatus('processing');
  await deps.projectRepo.save(project);

  try {
    await deps.taskQueue.add(
      'regenerate-panel',
      { projectId, panelIndex, regenFeedback: feedback },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      }
    );
  } catch (err) {
    // The queue is down or the job was rejected. Without rollback the
    // project would be stuck as "processing" with a pending panel forever.
    panels[panelIndex]!.setStatus(originalPanelStatus);
    project.setPanels(panels);
    project.setStatus(originalProjectStatus);
    try {
      await deps.projectRepo.save(project);
    } catch (rollbackErr) {
      deps.logger.error(
        `[regeneratePanel] Rollback save failed for project ${projectId}: ` +
          (rollbackErr instanceof Error
            ? rollbackErr.message
            : String(rollbackErr))
      );
    }
    throw err;
  }

  deps.logger.info(
    `[regeneratePanel] Enqueued panel ${panelIndex} regeneration for project ${projectId}`
  );
}
