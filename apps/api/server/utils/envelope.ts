import { ResponseEnvelope } from '../types/http.js';

/**
 * Build a successful response envelope.
 * @template T - Type of response data
 * @param data - Response payload
 * @returns Envelope with success: true and provided data
 */
export const ok = <T>(data: T): ResponseEnvelope<T> => ({
  success: true,
  data,
});

/**
 * Build an error response envelope.
 * @param code - Error code (e.g., "VALIDATION_ERROR", "NOT_FOUND")
 * @param message - Human-readable error message
 * @param details - Optional structured detail payload (e.g. partial-failure list)
 * @returns Envelope with success: false and error details
 */
export const fail = (
  code: string,
  message: string,
  details?: unknown
): ResponseEnvelope => ({
  success: false,
  error: { code, message, ...(details !== undefined ? { details } : {}) },
});
