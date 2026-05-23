/**
 * Domain error classes for the PanelCraft system.
 * These should be thrown by application/infrastructure layers and caught by API boundary.
 */

/**
 * Base error class for all domain errors.
 * Inherits from native Error for proper instanceof checks in error handlers.
 */
export class DomainError extends Error {
  readonly timestamp: string;
  readonly code: string = 'INTERNAL_SERVER_ERROR';

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    // Maintain proper stack trace
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}

/**
 * Thrown when an LLM returns invalid JSON or unparseable content.
 */
export class LLMResponseParsingError extends DomainError {
  override readonly code = 'INTERNAL_SERVER_ERROR';
  constructor(message: string, readonly content?: string) {
    super(`LLM Response Parsing Error: ${message}`);
    Object.setPrototypeOf(this, LLMResponseParsingError.prototype);
  }
}

/**
 * Thrown when an LLM returns a valid response but with incorrect structure/count.
 */
export class LLMResponseValidationError extends DomainError {
  override readonly code = 'INTERNAL_SERVER_ERROR';
  constructor(message: string, readonly expected?: any, readonly received?: any) {
    super(`LLM Response Validation Error: ${message}`);
    Object.setPrototypeOf(this, LLMResponseValidationError.prototype);
  }
}

/**
 * Thrown when a call to an external LLM service fails (network, timeout, rate limit).
 */
export class ExternalServiceError extends DomainError {
  override readonly code = 'INTERNAL_SERVER_ERROR';
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly retryable: boolean = false
  ) {
    super(`External Service Error: ${message}`);
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

/**
 * Thrown when image generation fails.
 */
export class ImageGenerationError extends DomainError {
  override readonly code = 'INTERNAL_SERVER_ERROR';
  constructor(message: string, readonly reason?: string) {
    super(`Image Generation Error: ${message}`);
    Object.setPrototypeOf(this, ImageGenerationError.prototype);
  }
}

/**
 * Thrown when a requested resource is not found.
 */
export class NotFoundError extends DomainError {
  override readonly code = 'NOT_FOUND';
  constructor(message: string, readonly resourceId?: string) {
    super(`Not Found: ${message}`);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Thrown when user input validation fails.
 */
export class ValidationError extends DomainError {
  override readonly code = 'VALIDATION_ERROR';
  constructor(message: string, readonly field?: string, readonly value?: unknown) {
    super(`Validation Error: ${message}`);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Helper to determine if an error is retryable.
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof ExternalServiceError) {
    return error.retryable;
  }
  return false;
}

/**
 * Helper to map errors to HTTP status codes.
 */
export function errorToHttpStatus(error: Error): number {
  if (error instanceof ValidationError) return 400;
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ExternalServiceError) {
    if (error.statusCode) return error.statusCode;
    return 500;
  }
  return 500;
}
