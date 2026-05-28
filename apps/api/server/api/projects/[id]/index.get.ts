import { defineEventHandler, getRouterParam } from 'h3';
import { z } from 'zod';
import { NotFoundError } from '@panelcraft/shared';
import { ok } from '../../../utils/envelope.js';
import { parseParams } from '../../../utils/validation.js';
import { getComicUseCase } from '../../../utils/dependencies.js';
import { toSignedUrlIfPath } from '../../../utils/supabase.js';
import { requireUser, deriveOwnerId } from '../../../utils/auth-session.js';

interface PanelJSON {
  id: string;
  prompt?: string;
  status: string;
  generatedImageUrl?: string | null;
}

/**
 * GET /api/projects/:id
 * Fetch a single comic project with full details and panel information.
 * Now includes wizard-specific fields (genres, tones, styleReferences, coverImageUrl, layoutOptions).
 * @param event.params.id - Project UUID
 * @returns 200 with project details including panels array, or 404 if not found
 * @throws 400 if id is not a valid UUID
 */
export default defineEventHandler(async (event) => {
  const { id } = parseParams(z.object({ id: z.string().uuid() }), {
    id: getRouterParam(event, 'id'),
  });

  // Viewable if the caller owns it OR it's shared. Non-owners get read-only
  // access (mutation routes still enforce owner-only).
  const ownerId = deriveOwnerId(requireUser(event)).getValue();
  const share = await getComicUseCase(event).getProjectShareState(id);
  if (!share || (share.ownerId !== ownerId && !share.isShared)) {
    throw new NotFoundError(`Project ${id} not found`, id);
  }
  const isOwner = share.ownerId === ownerId;

  const project = await getComicUseCase(event).getProject(id);
  const j = project.toJSON();

  // Storage paths persisted in DB must be exchanged for short-lived signed
  // URLs before reaching the browser — `next/image` rejects relative paths.
  const moodBoardPaths: string[] = j.styleReferences?.moodBoardImages || [];
  const [coverImageUrl, composedImageUrl, panelImageUrls, moodBoardImageUrls] =
    await Promise.all([
      toSignedUrlIfPath(j.coverImageUrl),
      toSignedUrlIfPath(j.composedImageUrl),
      Promise.all(
        (j.panels || []).map((p: PanelJSON) =>
          toSignedUrlIfPath(p.generatedImageUrl)
        )
      ),
      Promise.all(moodBoardPaths.map((p) => toSignedUrlIfPath(p))),
    ]);

  const styleReferences = j.styleReferences
    ? {
        ...j.styleReferences,
        // Replace storage paths with signed URLs; drop any paths that failed to sign.
        moodBoardImages: moodBoardImageUrls.filter((u): u is string =>
          Boolean(u)
        ),
      }
    : null;

  return ok({
    project: {
      id: j.id,
      prompt: j.prompt,
      panelCount: j.panelCount,
      status: j.status,
      createdAt: j.createdAt,
      // Wizard-specific fields
      genres: j.genres,
      tones: j.tones,
      styleReferences,
      coverImageUrl,
      composedImageUrl,
      selectedLayout: j.selectedLayout,
      layoutOptions: j.layoutOptions,
      isShared: share.isShared,
      isOwner,
      // Panels
      panels:
        j.panels?.map((p: PanelJSON, idx: number) => ({
          id: p.id,
          index: idx,
          status: p.status,
          prompt: p.prompt,
          imageUrl: panelImageUrls[idx],
        })) || [],
    },
  });
});
