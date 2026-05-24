import { LoggerPort } from '../../application/ports/out/logger.out-port';

/**
 * Client-side logger adapter for web applications.
 * Handles logging in browser environment where Node.js features are unavailable.
 * Safely falls back to console methods with proper formatting.
 */
export class ClientLoggerAdapter implements LoggerPort {
  private readonly prefix: string;

  constructor(prefix = 'PanelCraft') {
    this.prefix = prefix;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'production') return;
    console.debug(this.formatMessage('DEBUG', message), meta ? meta : '');
  }

  info(message: string, meta?: Record<string, unknown>): void {
    console.info(this.formatMessage('INFO', message), meta ? meta : '');
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(this.formatMessage('WARN', message), meta ? meta : '');
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    const errorMeta = error ? { error: error.message, stack: error.stack } : {};
    console.error(this.formatMessage('ERROR', message), {
      ...errorMeta,
      ...(meta || {}),
    });
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${this.prefix}] [${level}] ${message}`;
  }
}
