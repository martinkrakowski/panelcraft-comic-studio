import { setResponseStatus } from 'h3'
import { errorToHttpStatus, DomainError, NotFoundError } from '@panelcraft/shared'

export function handleServerError(error: unknown, event: any) {
  const h3err = error as any

  // Extract the wrapped error if it exists AND is a proper Error instance.
  // When createError is called directly with options, h3err.cause holds the raw options object.
  const originalError = (h3err.cause instanceof Error) ? h3err.cause : error

  // Extract error code from domain error or h3 error
  let code = h3err.code ?? h3err.data?.code ?? 'INTERNAL_SERVER_ERROR'

  // Check if the original error is a domain error and get its code
  if (originalError instanceof NotFoundError) {
    code = 'NOT_FOUND'
  } else if (originalError instanceof DomainError) {
    code = (originalError as any).code ?? code
  }

  // Determine HTTP status code
  let status: number
  if (h3err.statusCode) {
    status = h3err.statusCode
  } else if (originalError instanceof Error) {
    status = errorToHttpStatus(originalError)
  } else {
    status = 500
  }

  // Override status based on error code if needed
  if (code === 'NOT_FOUND' && status !== 404) {
    status = 404
  } else if (code === 'VALIDATION_ERROR' && status !== 400) {
    status = 400
  }

  const message = (originalError instanceof Error ? originalError.message : null) ?? 'Internal server error'

  console.error(`[${status}] ${message}`)
  setResponseStatus(event, status)

  return { success: false, error: { code, message } }
}

export default handleServerError
