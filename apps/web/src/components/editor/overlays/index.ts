/**
 * Overlay components barrel.
 *
 * Exports the presentational SpeechBubble and CaptionBox used for
 * dialogue and narration in the comic editor and composed page views.
 *
 * These are intentionally thin UI primitives. They receive normalized
 * positions and callbacks; all state management, persistence, and domain
 * rules live elsewhere (per hexagonal architecture).
 */

export * from './SpeechBubble';
export * from './CaptionBox';
