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
}

// Re-export for convenience
export type { GeneratePanelCommand };
