import type {
  ImageCompositionPort,
  ComposeFinalPageOptions,
} from '../../application/ports/out/image-composition.out-port.js';
import { fetchWithTimeout } from '../utils/fetch-with-timeout.js';

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64
  };
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[];
  };
  finishReason?: string;
}

interface GeminiGenerateContentResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: {
    blockReason?: string;
    safetyRatings?: unknown[];
  };
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

/**
 * Adapter that composes a final comic page using Google's Gemini multi-image
 * input image model (default `gemini-2.5-flash-image-preview`, a.k.a.
 * "Nano Banana"). This model accepts multiple reference images alongside a
 * text prompt and returns a single generated image — well-suited to taking
 * N approved panel images plus a layout description and producing a unified
 * page bitmap with consistent lighting, gutters, and borders.
 *
 * Reads `GOOGLE_GENERATIVE_AI_API_KEY` from the environment (matches the
 * naming used by the `@google/generative-ai` SDK and what the project's
 * `.env` already uses for Gemini access). `GEMINI_API_KEY` is honored as
 * an alias for portability. The model can be overridden via
 * `GEMINI_COMPOSITION_MODEL` (e.g. when the preview model is GA'd under
 * a different name, or when swapping to `imagen-4.0-generate-001`).
 *
 * If neither key is set the constructor still succeeds (so the worker
 * can be initialized in environments without the key); `composeFinalPage`
 * itself throws a descriptive error so the worker can surface it to the
 * user instead of crashing the process at boot.
 */
export class GeminiImageCompositionAdapter implements ImageCompositionPort {
  private readonly apiKey =
    process.env['GOOGLE_GENERATIVE_AI_API_KEY'] ||
    process.env['GEMINI_API_KEY'];
  // Default to the GA Nano Banana model. The earlier `-preview` suffix was
  // dropped when the model graduated; override via `GEMINI_COMPOSITION_MODEL`
  // to try a higher-quality candidate (e.g. `gemini-3-pro-image-preview`).
  private readonly model =
    process.env['GEMINI_COMPOSITION_MODEL'] || 'gemini-2.5-flash-image';
  // Google's REST endpoint structure: /v1beta/models/<model>:generateContent
  private readonly baseEndpoint =
    'https://generativelanguage.googleapis.com/v1beta/models';
  private readonly requestTimeoutMs = 90_000;

  async composeFinalPage(options: ComposeFinalPageOptions): Promise<Buffer> {
    if (!this.apiKey) {
      throw new Error(
        'GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set'
      );
    }

    const fullPrompt = this.buildPrompt(options);
    const parts: GeminiPart[] = [{ text: fullPrompt }];
    for (const buf of options.panelImages) {
      parts.push({
        inlineData: {
          mimeType: 'image/webp',
          data: buf.toString('base64'),
        },
      });
    }

    const endpoint =
      `${this.baseEndpoint}/${encodeURIComponent(this.model)}:generateContent` +
      `?key=${encodeURIComponent(this.apiKey)}`;

    const response = await fetchWithTimeout(
      endpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          // Request an image in the response. Newer Gemini image models
          // accept this hint; older multimodal-text models will ignore it
          // and surface text-only candidates, which we handle below.
          //
          // 2:3 is the standard US comic-book page ratio (6.625" × 10.25"
          // ≈ 0.65). Gemini image-gen accepts an explicit `imageConfig.
          // aspectRatio`; without it the model returns near-square output
          // which then letterboxes inside the carousel's portrait frame.
          // We also reinforce the ratio in the text prompt as a
          // belt-and-suspenders measure since the field is honored on a
          // best-effort basis.
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: {
              aspectRatio: '2:3',
            },
          },
        }),
      },
      this.requestTimeoutMs
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Gemini composition failed (${response.status}): ${body}`
      );
    }

    const json = (await response.json()) as GeminiGenerateContentResponse;
    if (json.error) {
      throw new Error(
        `Gemini composition error (${json.error.code}): ${json.error.message}`
      );
    }
    if (json.promptFeedback?.blockReason) {
      throw new Error(
        `Gemini composition blocked: ${json.promptFeedback.blockReason}`
      );
    }

    const imagePart = json.candidates
      ?.flatMap((c) => c.content?.parts ?? [])
      .find((p) => p.inlineData?.data);
    if (!imagePart?.inlineData?.data) {
      // The model returned only text. Surface enough context for debugging
      // (the worker logs this) but avoid embedding base64 payloads.
      const textParts = json.candidates
        ?.flatMap((c) => c.content?.parts ?? [])
        .map((p) => p.text)
        .filter(Boolean)
        .join(' | ');
      throw new Error(
        `Gemini composition returned no image (finish: ` +
          `${json.candidates?.[0]?.finishReason || 'unknown'}; text: ` +
          `${textParts?.slice(0, 200) || '<none>'})`
      );
    }

    return Buffer.from(imagePart.inlineData.data, 'base64');
  }

  private buildPrompt(options: ComposeFinalPageOptions): string {
    const {
      layoutTemplate,
      storyPrompt,
      characterBible,
      regenFeedback,
      composeFlavor = 'composite-true',
    } = options;

    const cellInstructions = layoutTemplate.panels
      .map((rect, idx) => {
        const xPct = Math.round((rect.x / 4) * 100);
        const yPct = Math.round((rect.y / 4) * 100);
        const wPct = Math.round((rect.width / 4) * 100);
        const hPct = Math.round((rect.height / 4) * 100);
        return (
          `Panel ${idx + 1}: place at ${xPct}% from left, ${yPct}% from top, ` +
          `sized ${wPct}% wide × ${hPct}% tall.`
        );
      })
      .join('\n');

    const flavorInstruction =
      composeFlavor === 'repaint'
        ? `Treat each reference image as a style/content guide and repaint a unified page from scratch. Preserve characters and major story beats but harmonize linework, palette, and lighting across all panels.`
        : `Preserve each panel image faithfully — keep subjects, poses, expressions, and major content as shown. Harmonize lighting, color grading, and inking only at the seams between panels.`;

    const characterSegment = characterBible
      ? `Character bible (for consistency): ${JSON.stringify(characterBible)}`
      : '';

    const feedbackSegment = regenFeedback
      ? `Reviewer feedback to apply on this regeneration only: ${regenFeedback}`
      : '';

    return [
      `You are composing a single professional comic-book page from the supplied panel images.`,
      `Story prompt: ${storyPrompt}`,
      `Layout: "${layoutTemplate.name}" (${layoutTemplate.description}). The page must contain exactly ${layoutTemplate.panelCount} panel(s) arranged according to the geometry below. The grid is 4 units wide by 4 units tall; the percentages tell you where each cell sits on the page.`,
      cellInstructions,
      `Add clean white comic gutters between panels and a thin page border around the whole composition. Do not introduce extra panels, captions, or speech bubbles that are not present in the references.`,
      flavorInstruction,
      characterSegment,
      feedbackSegment,
      `Output requirements: a single composed image of the entire comic page in standard US comic-book portrait aspect ratio (2:3, i.e. 6.625" × 10.25"). The page must be taller than it is wide — DO NOT return a square or landscape image.`,
    ]
      .filter(Boolean)
      .join('\n\n');
  }
}
