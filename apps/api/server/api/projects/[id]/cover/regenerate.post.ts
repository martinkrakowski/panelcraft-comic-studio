import {
  createError,
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
  // with the same prompt" affordance, so `undefined` is a valid input.
  // A malformed body (Content-Type: application/json + bad JSON) is a
  // client error and gets surfaced as a 400; we don't silently fall back
  // to the no-feedback default in that case.
  let rawBody: unknown;
  try {
    rawBody = await readBody(event);
  } catch (err) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Malformed request body',
      data: { message: err instanceof Error ? err.message : String(err) },
    });
  }
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
