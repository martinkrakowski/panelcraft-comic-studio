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
}
