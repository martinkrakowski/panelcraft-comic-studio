import { defineEventHandler, getRouterParam } from 'h3'
import { z } from 'zod'
import { ok } from '../../../utils/envelope.js'
import { parseParams } from '../../../utils/validation.js'
import { getComicUseCase } from '../../../utils/dependencies.js'

export default defineEventHandler(async (event) => {
  const { id } = parseParams(z.object({ id: z.string().uuid() }), { id: getRouterParam(event, 'id') })
  const project = await getComicUseCase().getProject(id)
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
        imageUrl: p.generatedImageUrl,
      })),
    },
  })
})
