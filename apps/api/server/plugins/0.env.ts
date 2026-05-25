import { defineNitroPlugin } from 'nitropack/runtime';
import { config } from 'dotenv';
import { resolve } from 'path';

// Nitro's dotenv loading is async and runs after ESM module initialization,
// so process.env vars from .env are not available when plugins first run.
// Load root monorepo .env first (lower priority), then local apps/api/.env
// (higher priority, wins on conflicts). plugins run alphabetically so this
// runs before init.ts.
export default defineNitroPlugin(() => {
  config({ path: resolve(process.cwd(), '../../.env') });
  config({ path: resolve(process.cwd(), '.env') });
});
