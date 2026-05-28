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
    // OAuth login. `provider` selects the active IdP (adobe | google). An IdP
    // with empty clientId/clientSecret makes the auth routes report
    // demoMode=true and the UI offers a mock login instead of redirecting out.
    // Read once here so handlers don't touch process.env directly.
    auth: {
      provider: process.env.AUTH_PROVIDER ?? 'adobe',
      appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',
      adobe: {
        clientId: process.env.ADOBE_CLIENT_ID ?? '',
        clientSecret: process.env.ADOBE_CLIENT_SECRET ?? '',
        redirectUri:
          process.env.ADOBE_REDIRECT_URI ??
          'http://localhost:3000/auth/callback',
        imsOrigin:
          process.env.ADOBE_IMS_ORIGIN ?? 'https://ims-na1.adobelogin.com',
        scopes: process.env.ADOBE_SCOPES ?? 'openid,AdobeID,profile,email',
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        redirectUri:
          process.env.GOOGLE_REDIRECT_URI ??
          'http://localhost:3000/auth/callback',
        // Unused for Google (endpoints are fixed) but kept for config symmetry.
        imsOrigin: '',
        scopes: process.env.GOOGLE_SCOPES ?? 'openid email profile',
      },
    },
  },
};
