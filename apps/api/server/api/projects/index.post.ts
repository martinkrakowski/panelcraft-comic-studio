import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { ok } from '../../utils/envelope.js'
import { parseBody } from '../../utils/validation.js'
import { getComicUseCase } from '../../utils/dependencies.js'
import { CreateProjectSchema } from '../../utils/schemas.js'

/**
 * POST /api/projects
 * Create a new comic project and enqueue background generation workflow.
 * @param event.body - { prompt: string (10-1000 chars), panelCount: number (1-20) }
 * @returns 201 with { projectId: uuid, status: "created" }
 */
export default defineEventHandler(async (event) => {
  const { prompt, panelCount } = parseBody(CreateProjectSchema, await readBody(event))
  const projectId = await getComicUseCase(event).createProject(prompt, panelCount)
  setResponseStatus(event, 201)
  return ok({ projectId, status: 'created' })
})
