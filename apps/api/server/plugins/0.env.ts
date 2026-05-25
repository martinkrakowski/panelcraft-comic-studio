import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime';
import { config } from 'dotenv';

// Nitro's dotenv loading is async and runs after ESM module initialization,
// so process.env vars from .env are not available when plugins first run.
// Path is resolved at config load time in nitro.config.ts via import.meta.url
// (stable) rather than process.cwd() (fragile). Runs before init.ts because
// plugins execute alphabetically.
export default defineNitroPlugin(() => {
  const { rootEnvPath } = useRuntimeConfig();
  config({ path: rootEnvPath });
});
