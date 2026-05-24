import { setResponseStatus, H3Event, send } from 'h3';
import {
  errorToHttpStatus,
  DomainError,
  NotFoundError,
  defaultLogger,
} from '@panelcraft/shared';

/**
 * Central error handler for Nitro API server.
 * Normalizes thrown errors (domain errors, h3 validation errors, primitives) into
 * consistent JSON response envelope format. Logs detailed errors server-side while
 * returning generic messages for 5xx errors to prevent information disclosure.
 *
 * @param error - Unknown thrown value (Error, domain error, h3 error, or primitive)
 * @param event - H3 request event for status setting
 * @returns JSON error response with code and message fields
 */
export function handleServerError(error: unknown, event: H3Event) {
  const h3err =
    error !== null && typeof error === 'object'
      ? (error as Record<string, unknown>)
      : {};

  // Extract the wrapped error if it exists AND is a proper Error instance.
  // When createError is called directly with options, h3err.cause holds the raw options object.
  const originalError =
    h3err.cause instanceof Error
      ? h3err.cause
      : error instanceof Error
        ? error
        : undefined;

  // Extract error code from domain error or h3 error
  let code =
    (h3err.code as string | undefined) ??
    (h3err.data as Record<string, unknown> | undefined)?.code ??
    'INTERNAL_SERVER_ERROR';
  if (typeof code !== 'string') {
    code = 'INTERNAL_SERVER_ERROR';
  }

  // Check if the original error is a domain error and get its code
  if (originalError instanceof NotFoundError) {
    code = 'NOT_FOUND';
  } else if (originalError instanceof DomainError) {
    code = originalError.code;
  }

  // Determine HTTP status code
  let status: number;
  if (typeof h3err.statusCode === 'number') {
    status = h3err.statusCode;
  } else if (originalError instanceof Error) {
    status = errorToHttpStatus(originalError);
  } else {
    status = 500;
  }

  // Override status based on error code if needed
  if (code === 'NOT_FOUND' && status !== 404) {
    status = 404;
  } else if (
    (code === 'VALIDATION_ERROR' || code === 'PARSE_ERROR') &&
    status !== 400
  ) {
    status = 400;
  } else if (
    (code === 'SERVICE_ERROR' || code === 'IMAGE_GENERATION_ERROR') &&
    status !== 500
  ) {
    status = 500;
  }

  const logMessage =
    (originalError instanceof Error ? originalError.message : null) ??
    'Internal server error';
  const clientMessage = status >= 500 ? 'Internal server error' : logMessage;

  defaultLogger.error(`[${status}] ${logMessage}`);
  setResponseStatus(event, status);

  return send(
    event,
    JSON.stringify({ success: false, error: { code, message: clientMessage } }),
    'application/json'
  );
}

export default handleServerError;
