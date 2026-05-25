import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime';
import { config } from 'dotenv';

/**
 * Nitro startup plugin that synchronously loads the root `.env` into
 * `process.env` before any other plugin or handler runs.
 *
 * Nitro's built-in dotenv loading is async and resolves after ESM module
 * initialization, so vars referenced at module top-level (e.g. service-role
 * key checks, XAI_API_KEY) would otherwise be undefined when later plugins
 * first execute. This plugin closes that gap.
 *
 * - Reads `rootEnvPath` from `useRuntimeConfig()`. The path is computed in
 *   `nitro.config.ts` from `import.meta.url` (stable across cwd changes)
 *   rather than `process.cwd()`.
 * - Calls `config({ path: rootEnvPath })` for its side effect — populates
 *   `process.env` with any keys not already set.
 * - Returns nothing. The plugin filename `0.env.ts` guarantees it runs
 *   before `init.ts` because Nitro executes plugins in alphabetical order.
 */
export default defineNitroPlugin(() => {
  const { rootEnvPath } = useRuntimeConfig();
  config({ path: rootEnvPath });
});
