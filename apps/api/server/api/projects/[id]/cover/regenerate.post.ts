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
import { RegenerateCoverSchema } from '../../../../utils/schemas.js';
import { getComicUseCase } from '../../../../utils/dependencies.js';

/**
 * POST /api/projects/:id/cover/regenerate
 *
 * Enqueue a fresh cover render for a `completed` project. The body
 * optionally carries reviewer `feedback` (≤ 1000 chars) appended to the
 * cover prompt for this run only — not persisted on the project. Returns
 * 202; the UI should poll until the project returns to `completed` to
 * see the new `coverImageUrl`.
 */
export default defineEventHandler(async (event) => {
  const { id } = parseParams(z.object({ id: z.string().uuid() }), {
    id: getRouterParam(event, 'id'),
  });
  // Body is optional — calling without feedback is a "re-roll the cover
  // with the same prompt" affordance.
  const rawBody = await readBody(event).catch(() => undefined);
  const { feedback } = rawBody
    ? parseBody(RegenerateCoverSchema, rawBody)
    : { feedback: undefined };

  try {
    await getComicUseCase(event).regenerateCover(id, feedback);
    setResponseStatus(event, 202);
    return ok({ message: 'Cover regeneration queued.' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      setResponseStatus(event, 404);
      return fail('PROJECT_NOT_FOUND', error.message);
    }
    if (error instanceof ValidationError) {
      setResponseStatus(event, 400);
      return fail('INVALID_COVER_REQUEST', error.message);
    }
    setResponseStatus(event, 500);
    return fail(
      'COVER_REGEN_FAILED',
      error instanceof Error
        ? error.message
        : 'Failed to enqueue cover regeneration'
    );
  }
});
