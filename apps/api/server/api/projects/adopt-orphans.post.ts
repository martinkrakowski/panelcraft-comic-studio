import { defineEventHandler } from 'h3';
import { ok } from '../../utils/envelope.js';
import { getComicUseCase } from '../../utils/dependencies.js';
import { requireUser, deriveOwnerId } from '../../utils/auth-session.js';

/**
 * POST /api/projects/adopt-orphans
 *
 * One-time recovery for comics created before auth existed (user_id IS NULL).
 * Claims every ownerless project for the signed-in user and marks it shared.
 * Idempotent — once there are no orphans left it adopts nothing.
 */
export default defineEventHandler(async (event) => {
  const ownerId = deriveOwnerId(requireUser(event));
  const adopted = await getComicUseCase(event).adoptOrphanProjects(ownerId);
  return ok({ adopted });
});
