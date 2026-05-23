import { z } from 'zod'

export const UUIDSchema = z.string().uuid()

export const CreateProjectSchema = z.object({
  prompt: z.string().trim().min(10).max(1000),
  panelCount: z.number().int().min(1).max(20),
})

export const SubmitReviewSchema = z.object({
  approved: z.boolean(),
  comment: z.string().trim().max(500).optional(),
})

export const ParamIdSchema = z.object({
  id: UUIDSchema,
})
