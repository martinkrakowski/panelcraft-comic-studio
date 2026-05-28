import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config as loadEnv } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootEnvPath = resolve(__dirname, '../../.env');

// Load the monorepo-root .env into process.env BEFORE the runtimeConfig literal
// below is evaluated. Nitro's built-in loader only looks in apps/api/, where no
// .env exists, so without this all process.env reads in this file would see an
// empty environment and silently fall back to defaults — most visibly making
// DISABLE_REDIS=false in the root .env get overridden by the 'true' fallback.
loadEnv({ path: rootEnvPath });

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
    rootEnvPath,
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
    // OAuth login config is intentionally NOT here. runtimeConfig is frozen at
    // build time, but the OAuth credentials aren't available during the
    // production Docker build — baking them would leave demoMode stuck on
    // regardless of the deployed .env. Auth config is resolved from process.env
    // at runtime instead; see getAuthConfig() in server/utils/auth-providers.ts.
  },
};
