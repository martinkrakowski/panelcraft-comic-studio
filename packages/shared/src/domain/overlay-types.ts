/**
 * Normalized 0-1 coordinate for overlay positioning.
 * Used for dialogue bubbles, captions, and future elements like titles.
 *
 * Coordinates are relative to the immediate container (panel or cover slide).
 * This contract is critical for:
 * - Framer Motion drag calculations
 * - Consistent rendering across different viewports
 * - html-to-image export safety (positions survive scaling)
 */
export interface NormalizedPoint {
  /** X position as fraction of container width (0 = left edge, 1 = right edge) */
  x: number;
  /** Y position as fraction of container height (0 = top edge, 1 = bottom edge) */
  y: number;
}

/**
 * A single dialogue entry (speech bubble, thought bubble, or shout).
 * Persisted on the Panel entity and rendered as an overlay.
 *
 * Text content is treated as structured data — never baked into the generated image.
 */
export interface DialogueEntry {
  id: string;
  text: string;
  /** Free-text speaker label (e.g. "NARRATOR", character name). Future: link to CharacterBible. */
  speaker?: string;
  variant: 'speech' | 'thought' | 'shout';
  position: NormalizedPoint;
  /** Where the bubble's tail should point (usually a character's mouth) */
  tailTarget?: NormalizedPoint;
}

/**
 * A caption / narration box entry.
 * These are typically rectangular, tailless, and edge-aligned.
 */
export interface CaptionEntry {
  id: string;
  text: string;
  variant: 'caption';
  position: NormalizedPoint;
}
