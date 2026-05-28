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
  const projects = await getComicUseCase(event).listProjectsByOwner(ownerId);
  const summaries = await Promise.all(
    projects.map(async (p) => {
      const j = p.toJSON();
      const coverImageUrl = await toSignedUrlIfPath(j.coverImageUrl);
      return {
        id: j.id,
        prompt: j.prompt.substring(0, 50),
        panelCount: j.panelCount,
        status: j.status,
        createdAt: j.createdAt,
        coverImageUrl,
      };
    })
  );
  return ok({ projects: summaries });
});
