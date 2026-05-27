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

// Surface final-composition status constants for the same reason.
export {
  COMPOSING_STATUS,
  PENDING_REVIEW_FINAL_STATUS,
} from './application/handlers/finalCompositionHandler.js';

// Surface cover-regen status constants — emitted by the regenerate-cover
// handler and worker, and detected by the cover HITL routing.
export {
  REGENERATING_COVER_STATUS,
  PENDING_REVIEW_COVER_STATUS,
} from './application/handlers/submitReviewHandler.js';
