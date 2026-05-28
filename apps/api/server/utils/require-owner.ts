import type { H3Event } from 'h3';
import { NotFoundError } from '@panelcraft/shared';
import type { OwnerId } from '@panelcraft/comic-project-management';
import { requireUser, deriveOwnerId } from './auth-session.js';
import { getComicUseCase } from './dependencies.js';

/**
 * Authorize a per-project operation: require a signed-in user (401 if absent),
 * then confirm they own the project. Projects owned by someone else — or legacy
 * rows with no owner — are reported as NotFound (404) so existence isn't leaked.
 *
 * @returns the caller's derived owner id, for any follow-on use.
 */
export async function requireProjectOwner(
  event: H3Event,
  projectId: string
): Promise<OwnerId> {
  const ownerId = deriveOwnerId(requireUser(event));
  const projectOwner =
    await getComicUseCase(event).getProjectOwnerId(projectId);

  if (projectOwner === null || projectOwner !== ownerId.getValue()) {
    throw new NotFoundError(`Project ${projectId} not found`, projectId);
  }

  return ownerId;
}
