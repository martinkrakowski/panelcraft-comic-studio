import { defineEventHandler, readBody, setResponseStatus } from 'h3';
import { ok, fail } from '../../../utils/envelope.js';
import { parseBody } from '../../../utils/validation.js';
import { SelectLayoutSchema, ParamIdSchema } from '../../../utils/schemas.js';
import { getComicUseCase } from '../../../utils/dependencies.js';

/**
 * PATCH /api/projects/[id]/layout
 *
 * Persist a new `selectedLayout` value without re-running any part of the
 * generation pipeline. Used to swap layouts on `completed` / `pending_review`
 * projects when the change only affects how existing panels are arranged on
 * the composed page — no resume job is enqueued and project status is
 * preserved. POST `/layout` remains the entry point for the wizard's initial
 * layout-pick flow (which does enqueue a resume).
 *
 * @param event.body - { selectedLayout: string }
 */
export default defineEventHandler(async (event) => {
  const { id } = parseBody(ParamIdSchema, event.context.params);
  const { selectedLayout } = parseBody(
    SelectLayoutSchema,
    await readBody(event)
  );

  try {
    await getComicUseCase(event).updateSelectedLayout(id, selectedLayout);
    setResponseStatus(event, 200);
    return ok({ id, selectedLayout });
  } catch (error) {
    setResponseStatus(event, 500);
    return fail(
      'LAYOUT_UPDATE_FAILED',
      error instanceof Error ? error.message : 'Failed to update layout'
    );
  }
});
