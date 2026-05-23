import { defineEventHandler, getRouterParam, readBody, setResponseStatus } from 'h3'
import { z } from 'zod'
import { ok } from '../../../utils/envelope.js'
import { parseBody, parseParams } from '../../../utils/validation.js'
import { getComicUseCase } from '../../../utils/dependencies.js'
import { SubmitReviewSchema } from '../../../utils/schemas.js'

export default defineEventHandler(async (event) => {
  const { id } = parseParams(z.object({ id: z.string().uuid() }), { id: getRouterParam(event, 'id') })
  const { approved, comment } = parseBody(SubmitReviewSchema, await readBody(event))
  await getComicUseCase().submitReview(id, approved, comment?.trim())
  setResponseStatus(event, 202)
  return ok({ message: 'Review submitted. Workflow resumption queued.' })
})
