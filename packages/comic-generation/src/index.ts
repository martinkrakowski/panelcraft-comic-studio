// Export domain types and entities
export * from './domain/index.js';

// Export application ports and commands
export * from './application/index.js';

// Export infrastructure adapters
export * from './infrastructure/index.js';

// Surface extend-mode status constants so the comic worker (in apps/api) can
// emit and detect them without re-declaring the strings.
export {
  PENDING_REVIEW_EXTEND_STATUS,
  EXTENDING_STATUS,
} from './application/handlers/panelReconfigureHandler.js';
