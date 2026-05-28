import { createError, defineEventHandler, getHeader } from 'h3';
import { ok } from '../../utils/envelope.js';
import { getComicUseCase } from '../../utils/dependencies.js';
import { requireUser, deriveOwnerId } from '../../utils/auth-session.js';

/**
 * POST /api/projects/adopt-orphans
 *
 * Privileged, one-time recovery for comics created before auth existed
 * (user_id IS NULL). Claims every ownerless project for the signed-in user and
 * marks it shared. Idempotent — once there are no orphans it adopts nothing.
 *
 * Gated behind a migration token: the caller must be authenticated AND send an
 * `x-migration-token` header matching `MIGRATION_TOKEN`. The endpoint is
 * disabled (403) whenever that env var is unset, so it can't be abused to claim
 * orphan rows that might appear later.
 */
export default defineEventHandler(async (event) => {
  const expected = process.env.MIGRATION_TOKEN;
  const provided = getHeader(event, 'x-migration-token');
  if (!expected || provided !== expected) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Orphan adoption requires a valid migration token.',
      data: { code: 'FORBIDDEN' },
    });
  }

  const ownerId = deriveOwnerId(requireUser(event));
  const adopted = await getComicUseCase(event).adoptOrphanProjects(ownerId);
  return ok({ adopted });
});
