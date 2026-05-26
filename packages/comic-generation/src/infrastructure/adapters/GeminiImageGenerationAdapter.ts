import type { ImageGenerationPort } from '../../application/ports/out/image-generation.out-port.js';
import type { GeneratePanelCommand } from '../../application/commands/GeneratePanelCommand.js';

/**
 * Gemini 2.5 Flash Image adapter (chosen for cover landscape generation per design review).
 *
 * This is a **skeleton** implementation. It satisfies the ImageGenerationPort contract
 * so the system can be wired for landscape covers without changing call sites.
 *
 * To activate:
 *   1. `yarn add @google/generative-ai` (in comic-generation or root)
 *   2. Set GEMINI_API_KEY (or GOOGLE_API_KEY)
 *   3. In apps/api/server/plugins/init.ts, conditionally instantiate this adapter
 *      when COVER_IMAGE_PROVIDER=gemini (or similar env flag).
 *
 * The port already passes `aspect`, `reserveTitleSpace`, and `targetTitle` hints
 * specifically to support this provider swap for covers (while panels stay on xAI).
 *
 * See docs/planning/COVER-TITLE-IMPLEMENTATION-DESIGN-2026-05.md §2 for decision rationale.
 */
export class GeminiImageGenerationAdapter implements ImageGenerationPort {
  private readonly apiKey = process.env['GEMINI_API_KEY'] || process.env['GOOGLE_API_KEY'];

  async generatePanel(_command: GeneratePanelCommand): Promise<string> {
    // Panels remain on the primary xAI provider for cost/quality/latency reasons.
    // This adapter is intended primarily for cover generation.
    throw new Error(
      'GeminiImageGenerationAdapter.generatePanel is not implemented. ' +
        'Panels continue to use the xAI-backed ImageGenerationAdapter. ' +
        'Only cover generation should route through Gemini for landscape support.'
    );
  }

  async generateCover(options: {
    prompt: string;
    style?: unknown;
    characterBible?: unknown;
    aspect?: 'square' | 'landscape-3:2' | 'landscape-16:9' | 'portrait';
    reserveTitleSpace?: boolean;
    targetTitle?: string;
  }): Promise<Buffer> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY (or GOOGLE_API_KEY) environment variable is not set');
    }

    // TODO: Implement real Gemini call here using @google/generative-ai
    //
    // Example direction (once dependency is added):
    // const genAI = new GoogleGenerativeAI(this.apiKey);
    // const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });
    //
    // Build a prompt that includes the hygiene phrase when reserveTitleSpace is true,
    // and pass aspect ratio via the model's generation config.
    //
    // Then fetch the returned image and return as Buffer (consistent with current cover contract).

    const aspectNote = options.aspect ? ` [requested aspect: ${options.aspect}]` : '';
    const titleNote = options.targetTitle ? ` [target title hint: ${options.targetTitle}]` : '';

    throw new Error(
      `GeminiImageGenerationAdapter.generateCover is a skeleton. ` +
        `Would call Gemini 2.5 Flash Image here for cover with prompt +${aspectNote}${titleNote}. ` +
        `Implement using @google/generative-ai and return the image Buffer.`
    );
  }

  async generatePreview(
    _stylePrompt: string,
    _options?: { preset?: string; moodBoardImages?: string[] }
  ): Promise<Buffer> {
    // Preview generation can stay on the fast xAI path.
    throw new Error('GeminiImageGenerationAdapter.generatePreview not implemented (use xAI path).');
  }
}
