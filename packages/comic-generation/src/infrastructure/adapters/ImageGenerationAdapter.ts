import type { ImageGenerationPort } from '../../application/ports/out/ImageGenerationPort.js';
import type { GeneratePanelCommand } from '../../application/commands/GeneratePanelCommand.js';

interface XaiImageResponse {
  data: Array<{ url: string; revised_prompt?: string }>;
}

/**
 * Adapter for generating comic panel images using xAI's Grok image model.
 * Calls xAI's OpenAI-compatible images API directly.
 * Reads XAI_API_KEY from the environment.
 *
 * To switch providers (e.g., Adobe Firefly, Gemini): implement ImageGenerationPort
 * in a new adapter and swap it in the composition root.
 */
export class ImageGenerationAdapter implements ImageGenerationPort {
  private readonly apiKey = process.env['XAI_API_KEY'];
  private readonly model = 'grok-2-image';
  private readonly endpoint = 'https://api.x.ai/v1/images/generations';

  async generatePanel(command: GeneratePanelCommand): Promise<string> {
    if (!this.apiKey) {
      throw new Error('XAI_API_KEY environment variable is not set');
    }

    const fullPrompt = this.buildComicPrompt(command.prompt, command.styleModifiers);

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        prompt: fullPrompt,
        n: 1,
        response_format: 'url',
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`xAI image generation failed (${response.status}): ${body}`);
    }

    const json = (await response.json()) as XaiImageResponse;
    const url = json.data[0]?.url;

    if (!url) {
      throw new Error('xAI image generation returned no image URL');
    }

    return url;
  }

  private buildComicPrompt(basePrompt: string, modifiers?: string): string {
    const style = modifiers ? `, ${modifiers}` : '';
    return `${basePrompt}. Professional comic book panel, bold black outlines, vibrant colors, dynamic composition, high detail${style}. Comic art style.`;
  }
}
