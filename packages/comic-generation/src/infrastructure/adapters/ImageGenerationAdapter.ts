import { ImageGenerationPort, GeneratePanelCommand } from '../../application/ports/out/ImageGenerationPort';

/**
 * Adapter for generating comic panel images.
 * Currently uses a mock/fallback approach for demo purposes.
 * Can be extended to use Grok Imagine, Firefly, or other image generation APIs.
 */
export class ImageGenerationAdapter implements ImageGenerationPort {
  async generatePanel(command: GeneratePanelCommand): Promise<string> {
    const { prompt, referenceImageUrls = [], styleModifiers = '' } = command;

    const fullPrompt = this.buildComicPrompt(prompt, styleModifiers);

    try {
      console.log(`[ImageGeneration] Generating panel: ${fullPrompt.substring(0, 100)}...`);

      // TODO: Replace with actual image generation API (Grok Imagine, Firefly, etc.)
      // For now, return a placeholder image URL
      const imageUrl = `https://picsum.photos/id/${100 + (command.panelNumber || 0)}/1024/1024`;

      console.log(`[ImageGeneration] Success (placeholder): ${imageUrl}`);
      return imageUrl;

    } catch (error) {
      console.error('[ImageGeneration] Failed:', error);
      // Fallback to placeholder for demo
      return `https://picsum.photos/id/${100 + (command.panelNumber || 0)}/1024/1024`;
    }
  }

  private buildComicPrompt(basePrompt: string, modifiers: string): string {
    return `${basePrompt}. Professional comic book panel, bold black outlines, vibrant colors, dynamic composition, clear speech bubbles if needed, high detail, ${modifiers}. Comic art style.`;
  }
}
