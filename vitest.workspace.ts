import { defineWorkspace } from 'vitest/config';

/**
 * Vitest Workspace Configuration
 *
 * This configuration delegates test execution to package-specific vitest.config.ts files.
 * This ensures that:
 * - Frontend tests (web) run in jsdom with appropriate environment setup
 * - Backend tests (packages) run in node environment
 * - Each package's setup files and configurations are respected
 *
 * Execution paths:
 * - `yarn test` (root) → runs `turbo test` which dispatches to package configs
 * - `vitest` (direct) → uses this workspace config to run tests across packages
 * - IDE extensions (VS Code Vitest) → can use either path depending on configuration
 *
 * This workspace config is essential for direct vitest CLI usage and IDE integration.
 */
export default defineWorkspace([
  'apps/*',
  'packages/*',
]);
