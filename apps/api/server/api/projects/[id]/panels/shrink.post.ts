import {
  defineEventHandler,
  getRouterParam,
  readBody,
  setResponseStatus,
} from 'h3';
import { z } from 'zod';
import { ok, fail } from '../../../../utils/envelope.js';
import { parseParams, parseBody } from '../../../../utils/validation.js';
import { ShrinkPanelsSchema } from '../../../../utils/schemas.js';
import { getComicUseCase } from '../../../../utils/dependencies.js';

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
  const { keepIndices, selectedLayout } = parseBody(
    ShrinkPanelsSchema,
    await readBody(event)
  );

  try {
    await getComicUseCase(event).shrinkPanels(id, keepIndices, selectedLayout);
    setResponseStatus(event, 200);
    return ok({ id, keepIndices, selectedLayout });
  } catch (error) {
    setResponseStatus(event, 500);
    return fail(
      'PANEL_SHRINK_FAILED',
      error instanceof Error ? error.message : 'Failed to shrink panels'
    );
  }
});
