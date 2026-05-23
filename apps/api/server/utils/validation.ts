import { createError } from 'h3'
import { ZodSchema, ZodError } from 'zod'

export function parseBody<T>(schema: ZodSchema<T>, raw: unknown): T {
  try {
    return schema.parse(raw)
  } catch (e) {
    if (e instanceof ZodError)
      throw createError({
        statusCode: 400,
        message: 'Request validation failed',
        data: { code: 'VALIDATION_ERROR' },
      })
    throw e
  }
}

export function parseParams<T>(schema: ZodSchema<T>, raw: unknown): T {
  try {
    return schema.parse(raw)
  } catch (e) {
    if (e instanceof ZodError)
      throw createError({
        statusCode: 400,
        message: 'Path parameter validation failed',
        data: { code: 'VALIDATION_ERROR' },
      })
    throw e
  }
}
