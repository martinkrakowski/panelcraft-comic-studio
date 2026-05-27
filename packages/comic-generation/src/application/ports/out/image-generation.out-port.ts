import type { GeneratePanelCommand } from '../../commands/GeneratePanelCommand.js';

/**
 * Port interface for image generation adapters.
 * Implement this interface to swap between different image generation providers.
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
   * `regenFeedback`, when present, is appended to the prompt for this
   * call only — it must not be persisted on the project. Used by the
   * cover-regeneration worker job to steer a re-roll with user notes.
   *
   * @returns Image buffer of the generated cover
   */
  generateCover(options: {
    prompt: string;
    style?: unknown;
    characterBible?: unknown;
    regenFeedback?: string;
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
