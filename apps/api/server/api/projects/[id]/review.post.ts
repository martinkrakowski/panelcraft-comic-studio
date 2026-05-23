import { defineEventHandler, getRouterParam, readBody, setResponseStatus } from 'h3'
import { z } from 'zod'
import { ok } from '../../../utils/envelope.js'
import { parseBody, parseParams } from '../../../utils/validation.js'
import { getComicUseCase } from '../../../utils/dependencies.js'
import { SubmitReviewSchema } from '../../../utils/schemas.js'

/**
 * POST /api/projects/:id/review
 * Submit review feedback on a generated comic and enqueue workflow resumption.
 * @param event.params.id - Project UUID
 * @param event.body - { approved: boolean, comment?: string (max 500 chars) }
 * @returns 202 Accepted with { message: "Review submitted..." }
 * @throws 400 if id is not a valid UUID or body is invalid
 * @throws 404 if project not found
 */
export default defineEventHandler(async (event) => {
  const { id } = parseParams(z.object({ id: z.string().uuid() }), { id: getRouterParam(event, 'id') })
  const { approved, comment } = parseBody(SubmitReviewSchema, await readBody(event))
  await getComicUseCase().submitReview(id, approved, comment)
  setResponseStatus(event, 202)
  return ok({ message: 'Review submitted. Workflow resumption queued.' })
})
