/**
 * Logger port interface following hexagonal architecture.
 * Implementations should be provided via dependency injection.
 */
export interface LoggerPort {
  /**
   * Debug level logging - verbose development information
   * @param message - Log message
   * @param meta - Optional metadata object
   */
  debug(message: string, meta?: Record<string, unknown>): void;

  /**
   * Info level logging - key workflow events
   * @param message - Log message
   * @param meta - Optional metadata object
   */
  info(message: string, meta?: Record<string, unknown>): void;

  /**
   * Warn level logging - recoverable issues
   * @param message - Log message
   * @param meta - Optional metadata object
   */
  warn(message: string, meta?: Record<string, unknown>): void;

  /**
   * Error level logging - unrecoverable errors
   * @param message - Log message
   * @param error - Optional Error object
   * @param meta - Optional metadata object
   */
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
}
