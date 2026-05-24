import type { ImageGenerationPort } from '../../application/ports/out/image-generation.out-port.js';
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

    const fullPrompt = this.buildComicPrompt(
      command.prompt,
      command.styleModifiers
    );

    const response = await this.fetchWithTimeout(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
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
      throw new Error(
        `xAI image generation failed (${response.status}): ${body}`
      );
    }

    const json = (await response.json()) as XaiImageResponse;
    const url = json.data[0]?.url;

    if (!url) {
      throw new Error('xAI image generation returned no image URL');
    }

    return url;
  }

  /**
   * Generates a high-quality comic book cover image using the story prompt and optional style/character guidelines.
   *
   * @param options - The cover generation options.
   * @param options.prompt - The main text description or title of the comic story.
   * @param options.style - Optional style guides (expects globalStylePrompt).
   * @param options.characterBible - Optional character reference data to ensure visual consistency.
   * @returns A promise that resolves to a Buffer containing the generated PNG/JPEG image bytes.
   * @throws {Error} If the XAI_API_KEY is not set, the generation request fails, or the image download fails/times out.
   */
  async generateCover(options: {
    prompt: string;
    style?: unknown;
    characterBible?: unknown;
  }): Promise<Buffer> {
    if (!this.apiKey) {
      throw new Error('XAI_API_KEY environment variable is not set');
    }

    const styleDesc = options.style
      ? `Style: ${(options.style as Record<string, unknown>)?.globalStylePrompt || ''}`
      : '';
    const characterDesc = options.characterBible
      ? `Characters: ${JSON.stringify(options.characterBible)}`
      : '';
    const fullPrompt = `Comic book cover for story: ${options.prompt}. ${styleDesc} ${characterDesc}. Professional comic cover, bold title, vibrant colors, dynamic composition.`;

    const response = await this.fetchWithTimeout(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
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
      throw new Error(
        `xAI cover generation failed (${response.status}): ${body}`
      );
    }

    const json = (await response.json()) as XaiImageResponse;
    const imageUrl = json.data[0]?.url;
    if (!imageUrl)
      throw new Error('xAI cover generation returned no image URL');

    // Fetch image and convert to buffer
    const imageResponse = await this.fetchWithTimeout(imageUrl, {});
    if (!imageResponse.ok)
      throw new Error('Failed to fetch generated cover image');
    return Buffer.from(await imageResponse.arrayBuffer());
  }

  /**
   * Generates a style preview image containing a simple representative object using the style prompt.
   *
   * @param stylePrompt - The style prompt or description defining the art style.
   * @param options - Optional presets and mood board files.
   * @param options.preset - The style preset name (e.g., 'Retro', 'Manga') to inject.
   * @param options.moodBoardImages - Array of storage URLs or names from the project mood board.
   * @returns A promise that resolves to a Buffer containing the preview image bytes.
   * @throws {Error} If the XAI_API_KEY is not set, the preview request fails, or the image download fails/times out.
   */
  async generatePreview(
    stylePrompt: string,
    options?: { preset?: string; moodBoardImages?: string[] }
  ): Promise<Buffer> {
    if (!this.apiKey) {
      throw new Error('XAI_API_KEY environment variable is not set');
    }

    // Incorporate the chosen preset as a style guide and acknowledge any
    // mood board references the caller supplied. The image API does not
    // currently accept reference images directly, so we describe their
    // count in the prompt to bias the generation.
    const presetSegment = options?.preset
      ? ` Style preset: ${options.preset}.`
      : '';
    const moodBoardSegment =
      options?.moodBoardImages && options.moodBoardImages.length > 0
        ? ` Inspired by ${options.moodBoardImages.length} mood board reference${
            options.moodBoardImages.length === 1 ? '' : 's'
          }.`
        : '';
    const fullPrompt =
      `Quick style preview: ${stylePrompt}.${presetSegment}${moodBoardSegment} ` +
      `Simple comic object on neutral background, clean lines, flat colors.`;

    const response = await this.fetchWithTimeout(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
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
      throw new Error(
        `xAI preview generation failed (${response.status}): ${body}`
      );
    }

    const json = (await response.json()) as XaiImageResponse;
    const imageUrl = json.data[0]?.url;
    if (!imageUrl) {
      throw new Error('xAI preview generation returned no image URL');
    }

    const imageResponse = await this.fetchWithTimeout(imageUrl, {});
    if (!imageResponse.ok)
      throw new Error('Failed to fetch generated preview image');
    return Buffer.from(await imageResponse.arrayBuffer());
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs = 15000
  ): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (err) {
      if (
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err &&
          typeof err === 'object' &&
          'name' in err &&
          (err as { name: string }).name === 'AbortError')
      ) {
        throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(id);
    }
  }

  private buildComicPrompt(basePrompt: string, modifiers?: string): string {
    const style = modifiers ? `, ${modifiers}` : '';
    return `${basePrompt}. Professional comic book panel, bold black outlines, vibrant colors, dynamic composition, high detail${style}. Comic art style.`;
  }
}
