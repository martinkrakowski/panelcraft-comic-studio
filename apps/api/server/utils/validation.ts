import { createError } from 'h3'
import { ZodSchema, ZodError } from 'zod'

/**
 * Parse and validate request body payload against a Zod schema.
 * Throws an h3 400 error with code VALIDATION_ERROR on schema validation failure.
 * @template T - Schema output type
 * @param schema - Zod schema for validation
 * @param raw - Raw request body to validate
 * @returns Validated and parsed data
 * @throws H3Error with statusCode 400 and code VALIDATION_ERROR on Zod failure
 */
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

/**
 * Parse and validate route/path parameters against a Zod schema.
 * Throws an h3 400 error with code VALIDATION_ERROR on schema validation failure.
 * @template T - Schema output type
 * @param schema - Zod schema for validation
 * @param raw - Raw parameters object to validate
 * @returns Validated and parsed parameters
 * @throws H3Error with statusCode 400 and code VALIDATION_ERROR on Zod failure
 */
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
