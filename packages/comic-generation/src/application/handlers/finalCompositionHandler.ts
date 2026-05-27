import { NotFoundError, ValidationError, LoggerPort } from '@panelcraft/shared';
import type { RelationalDbPort } from '../ports/out/relational-db.out-port.js';
import type { JobQueuePort } from '../ports/out/job-queue.out-port.js';

/**
 * Status used while the compose-final-page worker is actively running the
 * AI composition pass. Treated as in-flight by polling (`useProject.ts`).
 */
export const COMPOSING_STATUS = 'composing';

/**
 * Status used to mark that the worker produced a composed page and is
 * paused for HITL approval. Distinct from `pending_review` so submitReview
 * routes to the compose-final-page worker pipeline instead of the original
 * `resume-comic` path (which assumes the LangGraph thread is paused at
 * hitlReview).
 */
export const PENDING_REVIEW_FINAL_STATUS = 'pending_review_final';

interface ComposeFinalPageDeps {
  projectRepo: RelationalDbPort;
  taskQueue: JobQueuePort;
  logger: LoggerPort;
}

/**
 * Kick off the AI-rendered final composition job for a `completed` project
 * (or retry from `pending_review_final`).
 *
 * Validates that every panel has a generated image — composing a page from
 * an unfinished comic would silently produce missing slots — then flips the
 * project into `composing` and enqueues `compose-final-page`. The worker
 * pulls panel images from Supabase storage, builds the geometry-aware
 * prompt, calls the composition adapter, uploads the result, and pauses
 * the project at `pending_review_final`.
 *
 * On enqueue failure we roll the project's status back to its pre-call
 * value (same pattern used by `extendPanels` and `regeneratePanel`) so the
 * UI doesn't strand at `composing` with no worker job behind it.
 */
export async function composeFinalPage(
  projectId: string,
  regenFeedback: string | undefined,
  composeFlavor: 'composite-true' | 'repaint' | undefined,
  deps: ComposeFinalPageDeps
): Promise<void> {
  const project = await deps.projectRepo.load(projectId);
  if (!project) {
    throw new NotFoundError(`Project ${projectId} not found`, projectId);
  }

  const currentStatus = project.getStatus();
  if (
    currentStatus !== 'completed' &&
    currentStatus !== PENDING_REVIEW_FINAL_STATUS
  ) {
    throw new ValidationError(
      `Cannot compose final page while project is "${currentStatus}" — ` +
        `only completed projects (or those at "${PENDING_REVIEW_FINAL_STATUS}") ` +
        `can run composition.`,
      'status',
      currentStatus
    );
  }

  const panels = project.getPanels();
  if (panels.length === 0) {
    throw new ValidationError(
      `Project ${projectId} has no panels — nothing to compose.`,
      'panels',
      0
    );
  }
  for (let i = 0; i < panels.length; i += 1) {
    const panel = panels[i]!;
    if (panel.getStatus().getValue() !== 'completed') {
      throw new ValidationError(
        `Panel ${i} is "${panel.getStatus().getValue()}" — all panels must ` +
          `be completed before final composition.`,
        'panels',
        i
      );
    }
    if (!panel.getGeneratedImageUrl()) {
      throw new ValidationError(
        `Panel ${i} has no generated image — cannot compose final page.`,
        'panels',
        i
      );
    }
  }

  project.setStatus(COMPOSING_STATUS);
  await deps.projectRepo.save(project);

  try {
    await deps.taskQueue.add(
      'compose-final-page',
      { projectId, regenFeedback, composeFlavor },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      }
    );
  } catch (enqueueErr) {
    project.setStatus(currentStatus);
    try {
      await deps.projectRepo.save(project);
    } catch (rollbackErr) {
      deps.logger.error(
        `[composeFinalPage] Rollback save failed for project ${projectId}: ` +
          (rollbackErr instanceof Error
            ? rollbackErr.message
            : String(rollbackErr))
      );
    }
    throw enqueueErr;
  }

  deps.logger.info(
    `[composeFinalPage] Enqueued compose-final-page for project ${projectId}` +
      (regenFeedback ? ' (with regen feedback)' : '')
  );
}
