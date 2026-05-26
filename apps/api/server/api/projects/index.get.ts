import { defineEventHandler } from 'h3'
import { ok } from '../../utils/envelope.js'
import { getComicUseCase } from '../../utils/dependencies.js'

/**
 * GET /api/projects
 * List all comic projects with summary information.
 * @returns 200 with array of projects (id, prompt summary, panelCount, status, createdAt)
 */
export default defineEventHandler(async (event) => {
  const projects = await getComicUseCase(event).listProjects()
  return ok({
    projects: projects.map((p) => {
      const j = p.toJSON()
      return {
        id: j.id,
        prompt: j.prompt.substring(0, 50),
        displayTitle: j.displayTitle ?? null,
        panelCount: j.panelCount,
        status: j.status,
        createdAt: j.createdAt,
      }
    }),
  })
})
