import { LoggerPort, createLogger } from '@panelcraft/shared';
import type { LLMClientPort } from '@panelcraft/comic-generation';
import { XaiLlmHttpClient } from './XaiLlmHttpClient.js';

const REASONING_MODEL = 'grok-4.20-0309-reasoning';
const NON_REASONING_MODEL = 'grok-4.20-0309-non-reasoning';

/**
 * xAI LLMClientPort implementation wrapping the Grok API.
 * Delegates HTTP communication and retry logic to XaiLlmHttpClient.
 *
 * call() routes to the reasoning model (complex orchestration tasks).
 * analyzePrompt() and extractCharacters() use the non-reasoning model for speed.
 */
export class XaiLLMClientAdapter implements LLMClientPort {
  private readonly http: XaiLlmHttpClient;

  constructor(logger?: LoggerPort) {
    const log = logger || createLogger('LLM');
    this.http = new XaiLlmHttpClient(process.env['XAI_API_KEY'] || '', log);
  }

  async call(
    systemPrompt: string,
    userPrompt: string,
    maxRetries: number = 2
  ): Promise<Record<string, unknown>> {
    return this.http.call(
      systemPrompt,
      userPrompt,
      REASONING_MODEL,
      maxRetries
    );
  }

  async analyzePrompt(prompt: string): Promise<{
    feedback: string;
    estimatedCharactersCount: number;
    suggestedGenres: string[];
    suggestedTones: string[];
  }> {
    const systemPrompt = `You are Varo, an AI comic story analyst. Analyze the user's story prompt and provide:
1. A friendly, encouraging feedback message about the prompt
2. Estimated number of characters in the story (integer)
3. Suggested genres (array of strings, e.g., ["Noir", "Mystery"])
4. Suggested tones (array of strings, e.g., ["Dark", "Suspenseful"])

Return ONLY valid JSON in this format: {
  "feedback": "string",
  "estimatedCharactersCount": number,
  "suggestedGenres": string[],
  "suggestedTones": string[]
}`;

    const response = await this.http.call(
      systemPrompt,
      prompt,
      NON_REASONING_MODEL
    );

    return {
      feedback: String(response.feedback || 'Interesting story concept!'),
      estimatedCharactersCount: Number(response.estimatedCharactersCount) || 3,
      suggestedGenres: Array.isArray(response.suggestedGenres)
        ? response.suggestedGenres.map(String)
        : [],
      suggestedTones: Array.isArray(response.suggestedTones)
        ? response.suggestedTones.map(String)
        : [],
    };
  }

  async extractCharacters(
    prompt: string,
    options?: { genres?: string[]; tones?: string[] }
  ): Promise<{ characters: Array<Record<string, unknown>> }> {
    const genres = options?.genres?.join(', ') || 'any';
    const tones = options?.tones?.join(', ') || 'any';

    const systemPrompt = `You are Varo, an AI character extraction specialist. Extract characters from the story prompt and return them in this JSON format: {
  "characters": [
    {
      "name": "string",
      "role": "protagonist|antagonist|supporting",
      "visual": "string describing visual appearance",
      "consistency": "string describing consistency notes"
    }
  ]
}

Genres: ${genres}
Tones: ${tones}

Return ONLY valid JSON.`;

    const response = await this.http.call(
      systemPrompt,
      prompt,
      NON_REASONING_MODEL
    );
    const characters = Array.isArray(response.characters)
      ? response.characters
      : [];
    return { characters };
  }
}
