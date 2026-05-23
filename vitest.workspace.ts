import { defineWorkspace } from 'vitest/config';

/**
 * Vitest Workspace Configuration
 *
 * This configuration delegates test execution to package-specific vitest.config.ts files.
 * This ensures that:
 * - Frontend tests (web) run in jsdom with React mocks and plugins
 * - Backend tests (packages) run in node environment
 * - Each package's setup files and configurations are respected
 *
 * Running `vitest` or `yarn test` from the root uses this workspace config,
 * ensuring IDE extensions (VS Code Vitest) and CLI commands execute correctly.
 */
export default defineWorkspace([
  'apps/*',
  'packages/*',
]);
