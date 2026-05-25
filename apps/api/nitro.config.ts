import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:3000'];

export default {
  srcDir: 'server',
  compatibilityDate: '2026-05-23',
  errorHandler: '~/utils/error',

  devServer: {
    port: 3001,
  },

  runtimeConfig: {
    rootEnvPath: resolve(__dirname, '../../.env'),
    port: process.env.PORT ?? '3001',
    redisHost: process.env.REDIS_HOST ?? 'localhost',
    redisPort: process.env.REDIS_PORT ?? '6379',
    // Default to 'true' so omitting DISABLE_REDIS disables the queue —
    // matches the documented behavior in DEPLOYMENT.md and prevents accidental
    // startup retries against a Redis that isn't running locally.
    disableRedis: process.env.DISABLE_REDIS ?? 'true',
    cors: {
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    },
  },
};
