import {
  defineEventHandler,
  getRouterParam,
  readBody,
  setResponseStatus,
} from 'h3';
import { z } from 'zod';
import { NotFoundError, ValidationError } from '@panelcraft/shared';
import { ok, fail } from '../../../../utils/envelope.js';
import { parseParams, parseBody } from '../../../../utils/validation.js';
import { ShrinkPanelsSchema } from '../../../../utils/schemas.js';
import { getComicUseCase } from '../../../../utils/dependencies.js';
import { requireProjectOwner } from '../../../../utils/require-owner.js';

/**
 * POST /api/projects/:id/panels/shrink
 *
 * Drop panels from a completed project, keeping only the indices the user
 * selected in the shrink dialog. Pure metadata edit — no regeneration. The
 * caller must pass the new layout to persist alongside the new panel count.
 */
export default defineEventHandler(async (event) => {
  const { id } = parseParams(z.object({ id: z.string().uuid() }), {
    id: getRouterParam(event, 'id'),
  });
  await requireProjectOwner(event, id);
  const { keepIndices, selectedLayout } = parseBody(
    ShrinkPanelsSchema,
    await readBody(event)
  );

  try {
    await getComicUseCase(event).shrinkPanels(id, keepIndices, selectedLayout);
    setResponseStatus(event, 200);
    return ok({ id, keepIndices, selectedLayout });
  } catch (error) {
    // Domain → HTTP mapping. shrinkPanels rejects with NotFoundError when
    // the project is missing and ValidationError on keepIndices guards or
    // when the project isn't in `completed` status.
    if (error instanceof NotFoundError) {
      setResponseStatus(event, 404);
      return fail('PROJECT_NOT_FOUND', error.message);
    }
    if (error instanceof ValidationError) {
      setResponseStatus(event, 400);
      return fail('INVALID_SHRINK_REQUEST', error.message);
    }
    setResponseStatus(event, 500);
    return fail(
      'PANEL_SHRINK_FAILED',
      error instanceof Error ? error.message : 'Failed to shrink panels'
    );
  }
});
