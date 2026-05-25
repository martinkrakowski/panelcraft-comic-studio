import { defineEventHandler, getRouterParam, setResponseStatus } from 'h3';
import { z } from 'zod';
import { ok } from '../../../../../utils/envelope.js';
import { parseParams } from '../../../../../utils/validation.js';
import { getComicUseCase } from '../../../../../utils/dependencies.js';

/**
 * POST /api/projects/:id/panels/:index/regenerate
 * Re-generate a single completed panel using the same prompt + style context
 * the workflow originally used. Project must be in `completed` or
 * `pending_review` state. Returns 202 Accepted; UI should poll the project
 * resource until the panel returns to `completed`.
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

  await getComicUseCase(event).regeneratePanel(id, index);
  setResponseStatus(event, 202);
  return ok({ message: 'Panel regeneration queued.' });
});
