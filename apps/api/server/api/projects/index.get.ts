import { defineEventHandler } from 'h3'
import { ok } from '../../utils/envelope.js'
import { getComicUseCase } from '../../utils/dependencies.js'

export default defineEventHandler(async () => {
  const projects = await getComicUseCase().listProjects()
  return ok({
    projects: projects.map((p) => {
      const j = p.toJSON()
      return {
        id: j.id,
        prompt: j.prompt.substring(0, 50),
        panelCount: j.panelCount,
        status: j.status,
        createdAt: j.createdAt,
      }
    }),
  })
})
