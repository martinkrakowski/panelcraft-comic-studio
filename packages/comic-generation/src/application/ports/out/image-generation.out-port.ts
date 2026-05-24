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
   * Generates a cover image using the configured provider
   * @returns Image buffer of the generated cover
   */
  generateCover(options: {
    prompt: string;
    style?: unknown;
    characterBible?: unknown;
  }): Promise<Buffer>;
}

// Re-export for convenience
export type { GeneratePanelCommand };
