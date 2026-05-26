import type { GeneratePanelCommand } from '../../commands/GeneratePanelCommand.js';

/**
 * Port interface for image generation adapters.
 * Implement this interface to swap between different image generation providers (xAI Grok Imagine today,
 * Adobe Firefly / Gemini tomorrow per project goals).
 *
 * Extended in cover-title-dialog workstream for:
 * - aspect ratio control (landscape covers via Gemini)
 * - reserveTitleSpace + targetTitle for prompt hygiene and title overlay prep (text never baked in art)
 *
 * @see ImageGenerationAdapter for impl
 * @see COVER-TITLE-IMPLEMENTATION-DESIGN-2026-05.md
 */
export interface ImageGenerationPort {
  /**
   * Generates a comic panel image using the configured provider (Grok Imagine, Firefly, etc.)
   * @returns Public URL of the generated image
   */
  generatePanel(command: GeneratePanelCommand): Promise<string>;

  /**
   * Generates a cover image using the configured provider.
   *
   * New options (non-breaking) support landscape covers and title-reserved clean artwork:
   * - aspect: provider-specific ratio (Gemini native; others via prompt)
   * - reserveTitleSpace: triggers append of hygiene phrase in adapter
   * - targetTitle: hint for model (overlay title is separate code concern)
   */
  generateCover(options: {
    prompt: string;
    style?: unknown;
    characterBible?: unknown;
    /** Aspect ratio for cover (square default for comics; landscape for modern covers). */
    aspect?: 'square' | 'landscape-3:2' | 'landscape-16:9' | 'portrait';
    /** If true, adapter appends "clean artwork, blank space reserved at top for title overlay..." etc. */
    reserveTitleSpace?: boolean;
    /** Optional short title hint passed through to image prompt (actual display title overlaid in UI/export). */
    targetTitle?: string;
  }): Promise<Buffer>;

  /**
   * Generates a quick style preview image
   * @returns Image buffer of the preview
   */
  generatePreview(
    stylePrompt: string,
    options?: { preset?: string; moodBoardImages?: string[] }
  ): Promise<Buffer>;
}

// Re-export for convenience
export type { GeneratePanelCommand };
