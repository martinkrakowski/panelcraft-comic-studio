import { defineEventHandler, getRouterParam } from 'h3';
import { z } from 'zod';
import { ok } from '../../../utils/envelope.js';
import { parseParams } from '../../../utils/validation.js';
import { getComicUseCase } from '../../../utils/dependencies.js';
import { getSignedUrl } from '../../../utils/supabase.js';
import { createLogger } from '@panelcraft/shared';

const logger = createLogger('projects.get');

interface PanelJSON {
  id: string;
  prompt?: string;
  status: string;
  generatedImageUrl?: string | null;
}

/**
 * Convert a Supabase Storage path stored on a project (e.g. `comics/<id>/covers/front.webp`)
 * to a freshly-signed short-lived URL the frontend can render. Returns the
 * original value unchanged if it's already an http(s) URL or empty.
 */
async function toSignedUrlIfPath(
  value: string | null | undefined
): Promise<string | null> {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  try {
    return await getSignedUrl('comics', value);
  } catch (err) {
    logger.warn(
      `Failed to sign storage path ${value}: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }
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
  const project = await getComicUseCase(event).getProject(id);
  const j = project.toJSON();

  // Storage paths persisted in DB must be exchanged for short-lived signed
  // URLs before reaching the browser — `next/image` rejects relative paths.
  const [coverImageUrl, ...panelImageUrls] = await Promise.all([
    toSignedUrlIfPath(j.coverImageUrl),
    ...(j.panels || []).map((p: PanelJSON) =>
      toSignedUrlIfPath(p.generatedImageUrl)
    ),
  ]);

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
      styleReferences: j.styleReferences,
      coverImageUrl,
      selectedLayout: j.selectedLayout,
      layoutOptions: j.layoutOptions,
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
