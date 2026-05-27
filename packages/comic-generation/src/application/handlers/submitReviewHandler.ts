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
import {
  COMPOSING_STATUS,
  PENDING_REVIEW_FINAL_STATUS,
} from './finalCompositionHandler.js';

/**
 * Status used while the regenerate-cover worker is actively rendering a
 * new cover bitmap. Treated as in-flight by polling.
 */
export const REGENERATING_COVER_STATUS = 'regenerating_cover';

/**
 * Status used to mark that the worker produced a new cover and is paused
 * for HITL approval. submitReview routes this through the regenerate-
 * cover pipeline (approve → completed; reject + feedback → re-enqueue).
 */
export const PENDING_REVIEW_COVER_STATUS = 'pending_review_cover';

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
  composeFlavor: 'composite-true' | 'repaint' | undefined,
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
  const isFinalReview = currentStatus === PENDING_REVIEW_FINAL_STATUS;
  const isCoverReview = currentStatus === PENDING_REVIEW_COVER_STATUS;
  const isStuckProcessing =
    currentStatus === 'processing' &&
    project.getLastReviewSubmittedAt() &&
    Date.now() - new Date(project.getLastReviewSubmittedAt()!).getTime() >
      PROCESSING_TIMEOUT_MS;

  if (
    currentStatus !== 'pending_review' &&
    !isExtendReview &&
    !isFinalReview &&
    !isCoverReview &&
    !isStuckProcessing
  ) {
    throw new ValidationError(
      `Cannot submit review for project in status "${currentStatus}". ` +
        `Project must be in "pending_review", "${PENDING_REVIEW_EXTEND_STATUS}", ` +
        `"${PENDING_REVIEW_FINAL_STATUS}", or "${PENDING_REVIEW_COVER_STATUS}" status.`,
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

  // Final-composition review bypasses LangGraph the same way extend mode
  // does. Approval lands the project back at `completed` with the composed
  // image preserved; rejection re-enqueues compose-final-page with the
  // user's feedback for one more pass.
  if (isFinalReview) {
    const feedbackValue = feedbackResult.value!.getValue();
    if (feedbackValue.approved) {
      project.setStatus('completed');
      project.setLastReviewSubmittedAt(new Date().toISOString());
      await deps.projectRepo.save(project);
      return;
    }

    // Snapshot the prior status + review timestamp so we can roll the
    // project out of `composing` if the queue add fails — otherwise the
    // UI would see an in-flight status with no worker behind it. Same
    // shape as `extendPanels` / `regeneratePanel`.
    const priorStatus = currentStatus;
    const priorReviewSubmittedAt = project.getLastReviewSubmittedAt();
    project.setStatus(COMPOSING_STATUS);
    project.setLastReviewSubmittedAt(new Date().toISOString());
    await deps.projectRepo.save(project);

    try {
      await deps.taskQueue.add(
        'compose-final-page',
        {
          projectId,
          regenFeedback:
            feedbackValue.comment ||
            feedbackValue.regenerationHint ||
            undefined,
          composeFlavor,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
        }
      );
    } catch (enqueueErr) {
      project.setStatus(priorStatus);
      project.setLastReviewSubmittedAt(priorReviewSubmittedAt);
      try {
        await deps.projectRepo.save(project);
      } catch (rollbackErr) {
        deps.logger.error(
          `[submitReview/final] Rollback save failed for project ${projectId}: ` +
            (rollbackErr instanceof Error
              ? rollbackErr.message
              : String(rollbackErr))
        );
      }
      throw enqueueErr;
    }
    return;
  }

  // Cover-review HITL branch. Mirrors the final-review path:
  //  - approval lands the project back at `completed` (the new cover URL
  //    has already been written to the row by the worker — approval just
  //    confirms it)
  //  - rejection re-enqueues regenerate-cover with the user's feedback,
  //    transitioning back to `regenerating_cover` for another roll
  if (isCoverReview) {
    const feedbackValue = feedbackResult.value!.getValue();
    if (feedbackValue.approved) {
      project.setStatus('completed');
      project.setLastReviewSubmittedAt(new Date().toISOString());
      await deps.projectRepo.save(project);
      return;
    }

    const priorStatus = currentStatus;
    const priorReviewSubmittedAt = project.getLastReviewSubmittedAt();
    project.setStatus(REGENERATING_COVER_STATUS);
    project.setLastReviewSubmittedAt(new Date().toISOString());
    await deps.projectRepo.save(project);

    try {
      await deps.taskQueue.add(
        'regenerate-cover',
        {
          projectId,
          regenFeedback:
            feedbackValue.comment ||
            feedbackValue.regenerationHint ||
            undefined,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
        }
      );
    } catch (enqueueErr) {
      project.setStatus(priorStatus);
      project.setLastReviewSubmittedAt(priorReviewSubmittedAt);
      try {
        await deps.projectRepo.save(project);
      } catch (rollbackErr) {
        deps.logger.error(
          `[submitReview/cover] Rollback save failed for project ${projectId}: ` +
            (rollbackErr instanceof Error
              ? rollbackErr.message
              : String(rollbackErr))
        );
      }
      throw enqueueErr;
    }
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

interface RegenerateCoverDeps {
  projectRepo: RelationalDbPort;
  taskQueue: JobQueuePort;
  logger: LoggerPort;
}

/**
 * Enqueue a fresh cover render for a completed project. The handler
 * mirrors `regeneratePanel`: validates the project, sets status to
 * `processing` so the polling UI stays active while the worker runs,
 * and rolls back on enqueue failure. The worker (in `comic-worker.ts`)
 * calls `imageGenPort.generateCover` with optional reviewer `feedback`
 * appended to the prompt and writes the result to the same Supabase
 * storage path the original cover used, so existing signed URLs and
 * downstream consumers transparently see the new image.
 */
export async function regenerateCover(
  projectId: string,
  feedback: string | undefined,
  deps: RegenerateCoverDeps
): Promise<void> {
  const project = await deps.projectRepo.load(projectId);
  if (!project) {
    throw new NotFoundError(`Project ${projectId} not found`, projectId);
  }

  const status = project.getStatus();
  // Restrict to the two settled cover lifecycle states: `completed`
  // (first regen on a project, or after the user previously approved the
  // last cover), and `pending_review_cover` (the user rejected the last
  // cover via the HITL surface and is asking for another roll). Any
  // other state has either the LangGraph thread or another out-of-graph
  // worker mid-operation, and squeezing a cover regen into that window
  // would race those workers on the project's status flag.
  if (status !== 'completed' && status !== PENDING_REVIEW_COVER_STATUS) {
    throw new ValidationError(
      `Cannot regenerate cover while project is "${status}" — only ` +
        `completed projects (or those at "${PENDING_REVIEW_COVER_STATUS}") ` +
        `accept cover regeneration.`,
      'status',
      status
    );
  }

  // Snapshot the prior status so we can restore it on enqueue failure.
  const originalStatus = status;

  project.setStatus(REGENERATING_COVER_STATUS);
  await deps.projectRepo.save(project);

  try {
    await deps.taskQueue.add(
      'regenerate-cover',
      { projectId, regenFeedback: feedback },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      }
    );
  } catch (err) {
    project.setStatus(originalStatus);
    try {
      await deps.projectRepo.save(project);
    } catch (rollbackErr) {
      deps.logger.error(
        `[regenerateCover] Rollback save failed for project ${projectId}: ` +
          (rollbackErr instanceof Error
            ? rollbackErr.message
            : String(rollbackErr))
      );
    }
    throw err;
  }

  deps.logger.info(
    `[regenerateCover] Enqueued cover regeneration for project ${projectId}` +
      (feedback ? ' (with feedback)' : '')
  );
}
