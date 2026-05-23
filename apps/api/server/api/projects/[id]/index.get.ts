import { defineEventHandler, getRouterParam } from 'h3'
import { z } from 'zod'
import { ok } from '../../../utils/envelope.js'
import { parseParams } from '../../../utils/validation.js'
import { getComicUseCase } from '../../../utils/dependencies.js'

/**
 * GET /api/projects/:id
 * Fetch a single comic project with full details and panel information.
 * @param event.params.id - Project UUID
 * @returns 200 with project details including panels array, or 404 if not found
 * @throws 400 if id is not a valid UUID
 */
export default defineEventHandler(async (event) => {
  const { id } = parseParams(z.object({ id: z.string().uuid() }), { id: getRouterParam(event, 'id') })
  const project = await getComicUseCase(event).getProject(id)
  const j = project.toJSON()
  return ok({
    project: {
      id: j.id,
      prompt: j.prompt,
      panelCount: j.panelCount,
      status: j.status,
      createdAt: j.createdAt,
      panels: j.panels.map((p: any, idx: number) => ({
        id: p.id,
        index: idx,
        status: p.status,
        prompt: p.prompt,
        imageUrl: p.generatedImageUrl,
      })),
    },
  })
})
