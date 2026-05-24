import { LoggerPort } from '../application/ports/out/logger.out-port';
import { ConsoleLoggerAdapter } from './adapters/console-logger.adapter';
import { PinoLoggerAdapter } from './adapters/pino-logger.adapter';
import { ClientLoggerAdapter } from './adapters/client-logger.adapter';

/**
 * Detect if running in browser environment
 */
function isBrowser(): boolean {
  return (
    typeof window !== 'undefined' && typeof window.document !== 'undefined'
  );
}

/**
 * Factory function to create the appropriate logger instance.
 * Uses Pino in production (Node.js), ClientLogger in browser, Console in development.
 */
export function createLogger(prefix?: string): LoggerPort {
  if (isBrowser()) {
    return new ClientLoggerAdapter(prefix);
  }

  const isProduction = process.env['NODE_ENV'] === 'production';
  if (isProduction) {
    return new PinoLoggerAdapter(prefix);
  }

  return new ConsoleLoggerAdapter(prefix);
}

/**
 * Default logger instance for use in places where dependency injection is not feasible.
 */
export const defaultLogger = createLogger();
