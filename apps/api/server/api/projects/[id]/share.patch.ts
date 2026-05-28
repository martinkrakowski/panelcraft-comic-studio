import {
  defineEventHandler,
  getRouterParam,
  readBody,
  setResponseStatus,
} from 'h3';
import { z } from 'zod';
import { ok } from '../../../utils/envelope.js';
import { parseParams, parseBody } from '../../../utils/validation.js';
import { getComicUseCase } from '../../../utils/dependencies.js';
import { requireProjectOwner } from '../../../utils/require-owner.js';

/**
 * PATCH /api/projects/:id/share
 *
 * Owner-only toggle for the "Share It" feature. When shared, the project
 * becomes viewable (read-only) by every authenticated user.
 *
 * Body: `{ shared: boolean }`
 */
export default defineEventHandler(async (event) => {
  const { id } = parseParams(z.object({ id: z.string().uuid() }), {
    id: getRouterParam(event, 'id'),
  });
  await requireProjectOwner(event, id);

  const { shared } = parseBody(
    z.object({ shared: z.boolean() }),
    await readBody(event)
  );

  await getComicUseCase(event).setProjectShared(id, shared);

  setResponseStatus(event, 200);
  return ok({ id, isShared: shared });
});
