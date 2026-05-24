import { defineEventHandler, readBody, setResponseStatus } from 'h3';
import { ok, fail } from '../../../utils/envelope.js';
import { parseBody } from '../../../utils/validation.js';
import { SelectLayoutSchema, ParamIdSchema } from '../../../utils/schemas.js';
import { getComicUseCase } from '../../../utils/dependencies.js';

/**
 * POST /api/projects/[id]/layout
 *
 * Select a layout for a project and enqueue the LangGraph resume job.
 *
 * Atomicity: the persisted layout choice and the queued resume job must
 * stay in sync. If `enqueueResumeComic` fails after `selectLayout`
 * commits, the project would hold a layout it never resumed against.
 * We compensate by reverting the layout back to its prior value before
 * surfacing the enqueue failure, so the caller can safely retry.
 *
 * @param event.body - { selectedLayout: string }
 * @returns 200 with updated project, 500 on failure (with rollback)
 */
export default defineEventHandler(async (event) => {
  const { id } = parseBody(ParamIdSchema, event.context.params);
  const { selectedLayout } = parseBody(
    SelectLayoutSchema,
    await readBody(event)
  );
  const useCase = getComicUseCase(event);

  // Capture previous layout for potential rollback
  let previousLayout: string | null = null;
  try {
    const existing = await useCase.getProject(id);
    previousLayout = existing?.getSelectedLayout() ?? null;
  } catch {
    // If we can't read prior state, proceed without rollback capability
  }

  let layoutCommitted = false;
  try {
    await useCase.selectLayout(id, selectedLayout);
    layoutCommitted = true;
    await useCase.enqueueResumeComic(id, selectedLayout);

    setResponseStatus(event, 200);
    return ok({ id, selectedLayout, status: 'pending_review' });
  } catch (error) {
    // If layout was committed but enqueue failed, attempt to revert so the
    // persisted state does not drift from the job queue. Rollback only when
    // we successfully captured the prior layout (non-null).
    let rolledBack = false;
    if (layoutCommitted && previousLayout) {
      try {
        await useCase.selectLayout(id, previousLayout);
        rolledBack = true;
      } catch (rollbackErr) {
        console.error(
          `[layout.post] Rollback failed for project ${id}:`,
          rollbackErr
        );
      }
    }
    setResponseStatus(event, 500);
    return fail(
      'LAYOUT_SELECT_FAILED',
      error instanceof Error ? error.message : 'Failed to select layout',
      {
        layoutCommitted,
        rolledBack,
        previousLayout: rolledBack ? previousLayout : undefined,
      }
    );
  }
});
