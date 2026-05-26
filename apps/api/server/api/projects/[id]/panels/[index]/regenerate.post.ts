import {
  defineEventHandler,
  getRouterParam,
  readBody,
  setResponseStatus,
} from 'h3';
import { z } from 'zod';
import { ok } from '../../../../../utils/envelope.js';
import { parseParams, parseBody } from '../../../../../utils/validation.js';
import { getComicUseCase } from '../../../../../utils/dependencies.js';

const regenerateBodySchema = z.object({
  feedback: z.string().trim().min(1).max(2000).optional(),
});

/**
 * POST /api/projects/:id/panels/:index/regenerate
 * Re-generate a single completed panel using the same prompt + style context
 * the workflow originally used. Optional `feedback` in the body is appended
 * to the panel prompt for this regeneration only (not persisted on the
 * panel). Project must be in `completed` or `pending_review` state. Returns
 * 202 Accepted; UI should poll the project resource until the panel returns
 * to `completed`.
 */
export default defineEventHandler(async (event) => {
  const { id, index } = parseParams(
    z.object({
      id: z.string().uuid(),
      index: z
        .string()
        .regex(/^\d+$/, 'index must be a non-negative integer')
        .transform((s) => Number.parseInt(s, 10)),
    }),
    {
      id: getRouterParam(event, 'id'),
      index: getRouterParam(event, 'index'),
    }
  );

  // Body is optional for back-compat with the no-feedback regenerate flow.
  const rawBody = await readBody(event).catch(() => undefined);
  const { feedback } = rawBody
    ? parseBody(regenerateBodySchema, rawBody)
    : { feedback: undefined };

  await getComicUseCase(event).regeneratePanel(id, index, feedback);
  setResponseStatus(event, 202);
  return ok({ message: 'Panel regeneration queued.' });
});
