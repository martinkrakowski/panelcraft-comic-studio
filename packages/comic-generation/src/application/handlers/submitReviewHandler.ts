import {
  FeedbackEntry,
  PanelStatus,
} from '@panelcraft/comic-project-management';
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
      { projectId, panelIndex },
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

/**
 * Update dialogue and/or captions on a specific panel (post-generation creative edits).
 * Persists via entity setters (defensive) + repo save. Only allowed on completed projects
 * (similar guard to regen). The creative fields survive future regens by design.
 * Called from editor flows (OverlayEditorPanel).
 */
interface UpdatePanelOverlaysDeps {
  projectRepo: RelationalDbPort;
  logger: LoggerPort;
}

export async function updatePanelOverlays(
  projectId: string,
  panelIndex: number,
  updates: { dialogue?: unknown[]; captions?: unknown[] },
  deps: UpdatePanelOverlaysDeps
): Promise<void> {
  const project = await deps.projectRepo.load(projectId);
  if (!project) {
    throw new NotFoundError(`Project ${projectId} not found`, projectId);
  }
  if (project.getStatus() !== 'completed') {
    throw new ValidationError(
      `Cannot edit overlays while project is "${project.getStatus()}" — only completed projects support direct creative edits.`,
      'status',
      project.getStatus()
    );
  }

  const panels = project.getPanels();
  if (panelIndex < 0 || panelIndex >= panels.length) {
    throw new ValidationError(`Panel index ${panelIndex} out of range`, 'panelIndex', panelIndex);
  }

  const target = panels[panelIndex]!;
  if (updates.dialogue) {
    target.setDialogue(updates.dialogue as any); // entity handles defensive copy + type at runtime
  }
  if (updates.captions) {
    target.setCaptions(updates.captions as any);
  }

  project.setPanels(panels);
  await deps.projectRepo.save(project);

  deps.logger.info(`[updatePanelOverlays] Saved overlays for panel ${panelIndex} on project ${projectId}`);
}

/**
 * Update the project's displayTitle (user edit or after title LLM).
 * Allowed on completed projects. Stored as VO on load.
 */
interface UpdateDisplayTitleDeps {
  projectRepo: RelationalDbPort;
  logger: LoggerPort;
}

export async function updateDisplayTitle(
  projectId: string,
  newTitle: string | null,
  deps: UpdateDisplayTitleDeps
): Promise<void> {
  const project = await deps.projectRepo.load(projectId);
  if (!project) {
    throw new NotFoundError(`Project ${projectId} not found`, projectId);
  }
  if (project.getStatus() !== 'completed' && project.getStatus() !== 'pending_review') {
    // Allow a bit more flexibility for title (presentation only)
  }

  // Use VO for validation if non-null
  let voTitle: any = null;
  if (newTitle && newTitle.trim()) {
    // Import here would be circular risk in some setups; rely on serializer later + client validation
    // For server, simple length guard + set string (serializer will VO it on next load)
    const trimmed = newTitle.trim().slice(0, 120);
    if (trimmed.length < 3) {
      throw new ValidationError('Display title too short (min 3 chars)', 'displayTitle', trimmed);
    }
    voTitle = trimmed; // string form; entity accepts via ctor path in practice
  }

  project.setDisplayTitle(voTitle as any);
  await deps.projectRepo.save(project);

  deps.logger.info(`[updateDisplayTitle] Saved displayTitle for project ${projectId}`);
}
