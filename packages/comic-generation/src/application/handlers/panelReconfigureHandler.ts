import {
  Panel,
  PanelStatus,
  PanelCount,
} from '@panelcraft/comic-project-management';
import { NotFoundError, ValidationError, LoggerPort } from '@panelcraft/shared';
import type { RelationalDbPort } from '../ports/out/relational-db.out-port.js';
import type { JobQueuePort } from '../ports/out/job-queue.out-port.js';

/**
 * Status used to mark that the project is mid-extend AND paused for HITL
 * review on a freshly-generated extension panel. It is distinct from plain
 * `pending_review` so that submitReview can route to the extend worker
 * pipeline (which bypasses LangGraph) instead of the original `resume-comic`
 * pipeline (which assumes the graph is paused at hitlReview).
 */
export const PENDING_REVIEW_EXTEND_STATUS = 'pending_review_extend';

/**
 * Status the project carries while the extend worker is actively generating
 * the next extension panel. Treated as an in-flight state by the polling UI.
 */
export const EXTENDING_STATUS = 'extending';

interface ExtendPanelsDeps {
  projectRepo: RelationalDbPort;
  taskQueue: JobQueuePort;
  logger: LoggerPort;
}

/**
 * Append new pending panels to a `completed` project and kick off the worker
 * that fills them in one-by-one with HITL pauses. New panel slots are added
 * with empty prompts — the worker generates the continuation prompts (via
 * LLM) and images on the fly so it can incorporate the user's review feedback
 * between rounds.
 *
 * Why a separate pipeline from `resume-comic`: the LangGraph workflow
 * terminates at `finalizeComic`/`END` once a project completes, so we cannot
 * resume it for additional panels. Routing extend rounds through a dedicated
 * worker keeps the graph's invariants intact (no half-terminated threads) and
 * gives the user the same review-each-panel UX they had during creation.
 */
export async function extendPanels(
  projectId: string,
  targetPanelCount: number,
  selectedLayout: string,
  deps: ExtendPanelsDeps
): Promise<void> {
  const project = await deps.projectRepo.load(projectId);
  if (!project) {
    throw new NotFoundError(`Project ${projectId} not found`, projectId);
  }

  const currentPanels = project.getPanels();
  const currentCount = currentPanels.length;
  if (targetPanelCount <= currentCount) {
    throw new ValidationError(
      `extendPanels target (${targetPanelCount}) must exceed current panel count (${currentCount})`,
      'targetPanelCount',
      targetPanelCount
    );
  }

  // Only allow extending from a settled project — running this against an
  // in-flight HITL/processing state would race the worker that owns those
  // panels.
  const status = project.getStatus();
  if (status !== 'completed') {
    throw new ValidationError(
      `Cannot extend panels while project is "${status}" — only ` +
        `completed projects can be extended.`,
      'status',
      status
    );
  }

  const newPanelCount = PanelCount.create(targetPanelCount);
  if (!newPanelCount.success || !newPanelCount.value) {
    throw new ValidationError(
      newPanelCount.error?.message || 'Invalid target panel count'
    );
  }

  // Append placeholder panels with empty prompts. The worker fills the
  // prompts in on first invocation so the LLM sees the freshest project
  // state (e.g. recent character bible edits).
  const pendingStatus = PanelStatus.create('pending');
  if (!pendingStatus.success || !pendingStatus.value) {
    throw new ValidationError('Failed to construct pending PanelStatus');
  }
  const extended: Panel[] = [...currentPanels];
  for (let i = currentCount; i < targetPanelCount; i += 1) {
    extended.push(
      Panel.fromJSON({
        id: `panel-${projectId}-${i}-${Date.now()}`,
        prompt: '',
        status: 'pending',
        generatedImageUrl: null,
      })
    );
  }

  project.setPanels(extended);
  project.setPanelCount(newPanelCount.value);
  project.setSelectedLayout(selectedLayout);
  project.setStatus(EXTENDING_STATUS);
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
  deps.logger.info(
    `[extendPanels] Enqueued extend-next-panel for project ${projectId} ` +
      `(${currentCount} → ${targetPanelCount})`
  );
}

interface ShrinkPanelsDeps {
  projectRepo: RelationalDbPort;
  logger: LoggerPort;
}

/**
 * Drop unwanted panels from a `completed` project, keeping only the ones
 * at `keepIndices` (preserving the chosen order), then update layout and
 * panel count to match. No regeneration happens — purely a metadata edit.
 *
 * The frontend dialog enforces `keepIndices.length` equals the new layout's
 * panel count; we re-validate here as a defense-in-depth check.
 */
export async function shrinkPanels(
  projectId: string,
  keepIndices: number[],
  selectedLayout: string,
  deps: ShrinkPanelsDeps
): Promise<void> {
  const project = await deps.projectRepo.load(projectId);
  if (!project) {
    throw new NotFoundError(`Project ${projectId} not found`, projectId);
  }

  const status = project.getStatus();
  if (status !== 'completed') {
    throw new ValidationError(
      `Cannot shrink panels while project is "${status}" — only ` +
        `completed projects can be shrunk.`,
      'status',
      status
    );
  }

  const currentPanels = project.getPanels();
  // Validate every index points to a real panel before mutating anything.
  for (const idx of keepIndices) {
    if (idx < 0 || idx >= currentPanels.length) {
      throw new ValidationError(
        `keepIndices contains out-of-range index ${idx} ` +
          `(project has ${currentPanels.length} panels)`,
        'keepIndices',
        idx
      );
    }
  }
  if (keepIndices.length >= currentPanels.length) {
    throw new ValidationError(
      `shrinkPanels keep-set (${keepIndices.length}) must be smaller ` +
        `than current panel count (${currentPanels.length}) — use the ` +
        `layout PATCH endpoint for same-count rearrangements.`,
      'keepIndices',
      keepIndices.length
    );
  }

  const kept = keepIndices.map((i) => currentPanels[i]!);
  const newCount = PanelCount.create(kept.length);
  if (!newCount.success || !newCount.value) {
    throw new ValidationError(
      newCount.error?.message || 'Invalid shrunken panel count'
    );
  }

  project.setPanels(kept);
  project.setPanelCount(newCount.value);
  project.setSelectedLayout(selectedLayout);
  // Status stays `completed` — we removed panels but didn't generate
  // anything new, so the project is still in a renderable terminal state.
  await deps.projectRepo.save(project);

  deps.logger.info(
    `[shrinkPanels] Project ${projectId} shrunk to ${kept.length} panels`
  );
}
