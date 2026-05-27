import sharp from 'sharp';
import type { ImageGenerationPort } from '../../application/ports/out/image-generation.out-port.js';
import type { GeneratePanelCommand } from '../../application/commands/GeneratePanelCommand.js';
import { fetchWithTimeout } from '../utils/fetch-with-timeout.js';

// Standard US comic book aspect ratio (6.625" × 10.25" ≈ 0.6463). We
// target 1024×1536 explicitly as the post-processing crop's destination
// box. The xAI images/generations endpoint does NOT accept a `size`
// parameter — it returns 400 "Argument not supported: size" — so the
// model itself is given only the prompt-level directive to render in
// portrait, and sharp enforces the aspect ratio afterwards regardless
// of what the model actually returns.
const COVER_WIDTH = 1024;
const COVER_HEIGHT = 1536;
const COVER_ASPECT_TOLERANCE = 0.02;

interface XaiImageResponse {
  data: Array<{ url: string; revised_prompt?: string }>;
}

/**
 * Adapter for generating comic panel images using xAI's Grok Imagine models.
 * Calls xAI's OpenAI-compatible images API directly via the `generate_image`
 * endpoint. Reads `XAI_API_KEY` from the environment.
 *
 * All image generation (covers, panels, style previews) uses prompt-only
 * `generate_image` requests — xAI does not currently support an OpenAI-style
 * image-edit endpoint, so character consistency across panels must come from
 * prompt engineering (style modifiers + character bible injected into the
 * panel prompt) rather than an img2img reference image.
 *
 * To switch providers (e.g., Adobe Firefly, Gemini): implement
 * ImageGenerationPort in a new adapter and swap it in the composition root.
 */
export class ImageGenerationAdapter implements ImageGenerationPort {
  private readonly apiKey = process.env['XAI_API_KEY'];
  // Model names are env-overridable so accounts without quality access can
  // ship with the standard tier without code changes. Defaults match the
  // standard model since it is more widely available on new teams.
  private readonly qualityModel =
    process.env['XAI_IMAGE_MODEL_QUALITY'] || 'grok-imagine-image';
  private readonly standardModel =
    process.env['XAI_IMAGE_MODEL_STANDARD'] || 'grok-imagine-image';
  private readonly generateEndpoint = 'https://api.x.ai/v1/images/generations';
  private readonly editEndpoint = 'https://api.x.ai/v1/images/edits';

  async generatePanel(command: GeneratePanelCommand): Promise<string> {
    if (!this.apiKey) {
      throw new Error('XAI_API_KEY environment variable is not set');
    }
    const fullPrompt = this.buildComicPrompt(
      command.prompt,
      command.styleModifiers
    );
    // Note: xAI's image API (as of late 2025) does not support OpenAI-style
    // image edits (multipart form data → 415). For now we always call
    // generate_image with a prompt-only request — character consistency must
    // come from the style modifiers and prompt engineering rather than an
    // img2img reference. Revisit if xAI ships a JSON-compatible edit endpoint.
    return this.generateImage(fullPrompt, this.qualityModel);
  }

  private async generateImage(prompt: string, model: string): Promise<string> {
    const response = await fetchWithTimeout(this.generateEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model, prompt, n: 1, response_format: 'url' }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `xAI generate_image failed (${response.status}): ${body}`
      );
    }
    const json = (await response.json()) as XaiImageResponse;
    const url = json.data[0]?.url;
    if (!url) throw new Error('xAI generate_image returned no image URL');
    return url;
  }

  private async editImage(
    referenceUrl: string,
    prompt: string
  ): Promise<string> {
    const imageResponse = await fetchWithTimeout(referenceUrl, {}, 30000);
    if (!imageResponse.ok) {
      throw new Error(
        `Failed to fetch reference image for edit: ${imageResponse.status}`
      );
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    const form = new FormData();
    form.append('model', this.qualityModel);
    form.append(
      'image',
      new Blob([imageBuffer], { type: 'image/webp' }),
      'reference.webp'
    );
    form.append('prompt', prompt);
    form.append('n', '1');
    form.append('response_format', 'url');

    const response = await fetchWithTimeout(
      this.editEndpoint,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: form as unknown as BodyInit,
      },
      60000
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`xAI edit_image failed (${response.status}): ${body}`);
    }
    const json = (await response.json()) as XaiImageResponse;
    const url = json.data[0]?.url;
    if (!url) throw new Error('xAI edit_image returned no image URL');
    return url;
  }

  async generateCover(options: {
    prompt: string;
    style?: unknown;
    characterBible?: unknown;
    regenFeedback?: string;
  }): Promise<Buffer> {
    if (!this.apiKey)
      throw new Error('XAI_API_KEY environment variable is not set');

    const styleDesc = options.style
      ? `Style: ${(options.style as Record<string, unknown>)?.globalStylePrompt || ''}`
      : '';
    const characterDesc = options.characterBible
      ? `Characters: ${JSON.stringify(options.characterBible)}`
      : '';
    // Reviewer feedback is appended to the prompt for this call only.
    // The base prompt (story + style + characters) is never mutated so a
    // subsequent regeneration without feedback returns to the original
    // direction unless new feedback is supplied.
    const feedbackDesc = options.regenFeedback
      ? ` Reviewer feedback for this regeneration: ${options.regenFeedback}.`
      : '';
    // Repeat the portrait-orientation directive at the start AND end of
    // the prompt: image models weight tokens near the boundaries more
    // heavily, and a single "portrait" instruction buried in the middle
    // of a long prompt is often ignored. The post-processing step still
    // crops to 2:3 if the model returns a square anyway.
    const fullPrompt =
      `Portrait-orientation comic book cover (taller than wide, ` +
      `standard 2:3 page aspect ratio) for story: ${options.prompt}. ` +
      `${styleDesc} ${characterDesc}. Professional comic cover, bold ` +
      `title at the top, vibrant colors, dynamic composition framed for ` +
      `a vertical poster. The image MUST be portrait orientation — taller ` +
      `than it is wide. Do not return a square or landscape image.` +
      `${feedbackDesc}`;

    const response = await fetchWithTimeout(this.generateEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.qualityModel,
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

    const imageResponse = await fetchWithTimeout(imageUrl, {});
    if (!imageResponse.ok)
      throw new Error('Failed to fetch generated cover image');
    const rawBuffer = Buffer.from(await imageResponse.arrayBuffer());
    return this.cropCoverToPortrait(rawBuffer);
  }

  /**
   * Force the cover Buffer into a 2:3 portrait box. xAI's Grok Imagine
   * returns square (1:1) covers by default and silently ignores the
   * OpenAI-style `size` hint, so without post-processing the UI
   * letterboxes the cover inside its portrait frame and the page-level
   * composition loop sees inconsistent dimensions. We center-crop to 2:3
   * with sharp's "attention" position heuristic so the kept slice is the
   * most visually salient horizontal band (typically the subject), then
   * re-encode as WebP for size/parity with the storage convention.
   *
   * If the source is already within tolerance of 2:3 we pass it through
   * untouched so re-encoding artifacts don't accumulate across runs.
   */
  private async cropCoverToPortrait(buffer: Buffer): Promise<Buffer> {
    const pipeline = sharp(buffer);
    const meta = await pipeline.metadata();
    if (!meta.width || !meta.height) return buffer;
    const targetRatio = COVER_WIDTH / COVER_HEIGHT;
    const actualRatio = meta.width / meta.height;
    if (Math.abs(actualRatio - targetRatio) < COVER_ASPECT_TOLERANCE) {
      return buffer;
    }
    return pipeline
      .resize({
        width: COVER_WIDTH,
        height: COVER_HEIGHT,
        fit: 'cover',
        position: 'attention',
      })
      .webp({ quality: 90 })
      .toBuffer();
  }

  async generatePreview(
    stylePrompt: string,
    options?: { preset?: string; moodBoardImages?: string[] }
  ): Promise<Buffer> {
    if (!this.apiKey)
      throw new Error('XAI_API_KEY environment variable is not set');

    const presetSegment = options?.preset
      ? ` Style preset: ${options.preset}.`
      : '';
    const moodBoardSegment =
      options?.moodBoardImages && options.moodBoardImages.length > 0
        ? ` Inspired by ${options.moodBoardImages.length} mood board reference${options.moodBoardImages.length === 1 ? '' : 's'}.`
        : '';
    const fullPrompt =
      `Quick style preview: ${stylePrompt}.${presetSegment}${moodBoardSegment} ` +
      `Simple comic object on neutral background, clean lines, flat colors.`;

    const response = await fetchWithTimeout(this.generateEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.standardModel,
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
    if (!imageUrl)
      throw new Error('xAI preview generation returned no image URL');

    const imageResponse = await fetchWithTimeout(imageUrl, {});
    if (!imageResponse.ok)
      throw new Error('Failed to fetch generated preview image');
    return Buffer.from(await imageResponse.arrayBuffer());
  }

  private buildComicPrompt(basePrompt: string, modifiers?: string): string {
    const style = modifiers ? `, ${modifiers}` : '';
    return `${basePrompt}. Professional comic book panel, bold black outlines, vibrant colors, dynamic composition, high detail${style}. Comic art style. Render every quoted line of dialog as a clearly hand-lettered SPEECH BUBBLE with a tail pointing to the speaker; render any indicated thought as a CLOUD-SHAPED THOUGHT BUBBLE with small trailing dots above the character; render any narration as a RECTANGULAR CAPTION BOX with a contrasting border at the top or bottom of the panel. Bubbles and captions are a non-negotiable, defining feature of the comic look — they must be present, large enough to read at a glance, and integrated naturally into the composition without covering faces.`;
  }
}
