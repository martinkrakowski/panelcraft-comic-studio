import pino from 'pino';
import { LoggerPort } from '../../application/ports/out/logger.out-port';

/**
 * Production-ready logger adapter using Pino.
 * Outputs structured JSON logs suitable for log aggregation systems.
 */
export class PinoLoggerAdapter implements LoggerPort {
  private readonly logger: pino.Logger;

  constructor(name = 'PanelCraft', options?: pino.LevelWithSilent) {
    this.logger = pino({
      name,
      level: options || process.env['LOG_LEVEL'] || 'info',
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
      },
      // Pretty print in development
      transport:
        process.env['NODE_ENV'] === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    });
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(meta || {}, message);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(meta || {}, message);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(meta || {}, message);
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    const errorMeta = error
      ? {
          err: { message: error.message, stack: error.stack, name: error.name },
        }
      : {};
    this.logger.error({ ...errorMeta, ...(meta || {}) }, message);
  }
}
