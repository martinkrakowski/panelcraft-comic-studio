/**
 * Command for generating a single comic panel image.
 * Contains all necessary context for the image generation adapter.
 */
export interface GeneratePanelCommand {
  /** The prompt describing what should appear in the panel */
  prompt: string;

  /** Reference images for character/style consistency */
  referenceImageUrls?: string[];

  /** Style modifiers (e.g., "marvel style, dynamic angles") */
  styleModifiers?: string;

  /** Panel number in the sequence (1-based for display) */
  panelNumber?: number;

  /**
   * Optional aspect ratio hint for the panel image generation.
   * Providers like Gemini support natively; xAI/Grok embed via prompt engineering.
   * Used in cover-title-dialog landscape work.
   */
  aspect?: 'square' | 'landscape-3:2' | 'landscape-16:9' | 'portrait';

  /**
   * When true, the image adapter MUST append the "clean artwork, blank space reserved..." hygiene
   * phrase so the generated bitmap has no baked text/lettering and reserves space (primarily for covers).
   */
  reserveTitleSpace?: boolean;

  /**
   * Optional short target title string passed as hint to the image model (presentation concern;
   * actual title overlay is always done in code/SVG later, never baked).
   */
  targetTitle?: string;
}
