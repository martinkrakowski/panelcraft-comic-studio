import {
  defineEventHandler,
  getRouterParam,
  readBody,
  setResponseStatus,
} from 'h3';
import { z } from 'zod';
import { NotFoundError, ValidationError } from '@panelcraft/shared';
import { ok, fail } from '../../../utils/envelope.js';
import { parseParams, parseBody } from '../../../utils/validation.js';
import { ComposeFinalPageSchema } from '../../../utils/schemas.js';
import { getComicUseCase } from '../../../utils/dependencies.js';

/**
 * POST /api/projects/:id/compose
 *
 * Queue the AI-rendered final composition pass for a completed project.
 * The worker renders a single bitmap of the comic page from the approved
 * panel images and pauses at `pending_review_final` for HITL approval.
 *
 * The endpoint is feature-gated by `FEATURE_FINAL_COMPOSITION`. When the
 * flag is off it returns 404 so the frontend can hide the surface without
 * branching on the env on the client. Idempotent: re-invoking on an
 * already-composed project replaces the previous composedImageUrl.
 */
export default defineEventHandler(async (event) => {
  if (process.env.FEATURE_FINAL_COMPOSITION !== 'true') {
    setResponseStatus(event, 404);
    return fail(
      'FEATURE_DISABLED',
      'Final composition feature is not enabled.'
    );
  }

  const { id } = parseParams(z.object({ id: z.string().uuid() }), {
    id: getRouterParam(event, 'id'),
  });
  const { regenFeedback, composeFlavor } = parseBody(
    ComposeFinalPageSchema,
    (await readBody(event).catch(() => ({}))) ?? {}
  );

  try {
    await getComicUseCase(event).composeFinalPage(
      id,
      regenFeedback,
      composeFlavor
    );
    setResponseStatus(event, 202);
    return ok({ message: 'Composition queued.' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      setResponseStatus(event, 404);
      return fail('PROJECT_NOT_FOUND', error.message);
    }
    if (error instanceof ValidationError) {
      setResponseStatus(event, 400);
      return fail('INVALID_COMPOSE_REQUEST', error.message);
    }
    setResponseStatus(event, 500);
    return fail(
      'COMPOSITION_FAILED',
      error instanceof Error
        ? error.message
        : 'Failed to enqueue final composition'
    );
  }
});
