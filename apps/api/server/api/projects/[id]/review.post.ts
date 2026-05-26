import { defineEventHandler, getRouterParam, readBody, setResponseStatus } from 'h3'
import { z } from 'zod'
import { ok } from '../../../utils/envelope.js'
import { parseBody, parseParams } from '../../../utils/validation.js'
import { getComicUseCase } from '../../../utils/dependencies.js'
import { SubmitReviewSchema } from '../../../utils/schemas.js'

/**
 * POST /api/projects/:id/review
 *
 * Primary purpose: Submit HITL review feedback and resume the LangGraph workflow.
 *
 * Secondary (overlay editor) purpose: Accept creative mutations after the project is completed.
 *   - Overlay updates: { panelIndex, dialogue?, captions? }
 *   - Title update:     { displayTitle }
 *
 * This dual-purpose approach was chosen to avoid creating new route files during initial integration.
 * Recommended future improvement: Extract dedicated endpoints or a generic "creative update" route.
 */
export default defineEventHandler(async (event) => {
  const { id } = parseParams(z.object({ id: z.string().uuid() }), { id: getRouterParam(event, 'id') })
  const body = await readBody(event)

  const useCase = getComicUseCase(event)

  // Creative overlay / title edits from editor (post-gen). Detected by presence of keys.
  if (body && (body.dialogue !== undefined || body.captions !== undefined || body.displayTitle !== undefined)) {
    if (typeof body.panelIndex === 'number' && (body.dialogue || body.captions)) {
      await useCase.updatePanelOverlays(id, body.panelIndex, {
        dialogue: body.dialogue,
        captions: body.captions,
      })
      setResponseStatus(event, 200)
      return ok({ message: 'Panel overlays updated.' })
    }
    if (body.displayTitle !== undefined) {
      await useCase.updateDisplayTitle(id, body.displayTitle)
      setResponseStatus(event, 200)
      return ok({ message: 'Display title updated.' })
    }
    // fallthrough if malformed
  }

  // Original HITL review path
  const { approved, comment } = parseBody(SubmitReviewSchema, body)
  await useCase.submitReview(id, approved, comment)
  setResponseStatus(event, 202)
  return ok({ message: 'Review submitted. Workflow resumption queued.' })
})
