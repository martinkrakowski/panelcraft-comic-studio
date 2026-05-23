import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { ok } from '../../utils/envelope.js'
import { parseBody } from '../../utils/validation.js'
import { getComicUseCase } from '../../utils/dependencies.js'
import { CreateProjectSchema } from '../../utils/schemas.js'

export default defineEventHandler(async (event) => {
  const { prompt, panelCount } = parseBody(CreateProjectSchema, await readBody(event))
  const projectId = await getComicUseCase().createProject(prompt.trim(), panelCount)
  setResponseStatus(event, 201)
  return ok({ projectId, status: 'created' })
})
