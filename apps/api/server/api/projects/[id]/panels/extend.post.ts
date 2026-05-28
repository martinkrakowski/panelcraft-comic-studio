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
import { ExtendPanelsSchema } from '../../../../utils/schemas.js';
import { getComicUseCase } from '../../../../utils/dependencies.js';
import { requireProjectOwner } from '../../../../utils/require-owner.js';

/**
 * POST /api/projects/:id/panels/extend
 *
 * Add empty pending panels to a completed project and kick off the worker
 * that fills them one-by-one with HITL pauses between each. Body must
 * specify a higher target panel count than the project currently has, plus
 * the new layout template ID to persist alongside the addition.
 */
export default defineEventHandler(async (event) => {
  const { id } = parseParams(z.object({ id: z.string().uuid() }), {
    id: getRouterParam(event, 'id'),
  });
  await requireProjectOwner(event, id);
  const { targetPanelCount, selectedLayout } = parseBody(
    ExtendPanelsSchema,
    await readBody(event)
  );

  try {
    await getComicUseCase(event).extendPanels(
      id,
      targetPanelCount,
      selectedLayout
    );
    setResponseStatus(event, 202);
    return ok({ message: 'Panel extension queued.', targetPanelCount });
  } catch (error) {
    // Domain → HTTP mapping. extendPanels rejects with NotFoundError when
    // the project is missing and ValidationError on guards (target ≤ current
    // count, status !== completed, panel count out of range).
    if (error instanceof NotFoundError) {
      setResponseStatus(event, 404);
      return fail('PROJECT_NOT_FOUND', error.message);
    }
    if (error instanceof ValidationError) {
      setResponseStatus(event, 400);
      return fail('INVALID_EXTEND_REQUEST', error.message);
    }
    setResponseStatus(event, 500);
    return fail(
      'PANEL_EXTEND_FAILED',
      error instanceof Error ? error.message : 'Failed to extend panels'
    );
  }
});
