import { defineEventHandler } from 'h3';
import { ok } from '../../utils/envelope.js';
import { getComicUseCase } from '../../utils/dependencies.js';
import { toSignedUrlIfPath } from '../../utils/supabase.js';
import { requireUser, deriveOwnerId } from '../../utils/auth-session.js';

/**
 * GET /api/projects
 * List all comic projects with summary information. Cover image paths are
 * signed in parallel before returning so the dashboard can render thumbnails
 * directly — failed signs become `null`, which the UI renders as a placeholder.
 *
 * @returns 200 with array of projects (id, prompt summary, panelCount, status, createdAt, coverImageUrl?)
 */
export default defineEventHandler(async (event) => {
  const ownerId = deriveOwnerId(requireUser(event));
  // Owned projects plus every shared project. `isOwner` lets the dashboard
  // show edit/share affordances only on the caller's own comics.
  const rows = await getComicUseCase(event).listVisibleProjects(ownerId);
  const summaries = await Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      prompt: r.prompt.substring(0, 50),
      panelCount: r.panelCount,
      status: r.status,
      createdAt: r.createdAt,
      coverImageUrl: await toSignedUrlIfPath(r.coverImageUrl),
      isShared: r.isShared,
      isOwner: r.ownerId === ownerId,
    }))
  );
  return ok({ projects: summaries });
});
