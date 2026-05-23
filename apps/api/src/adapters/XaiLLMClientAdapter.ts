import {
  LLMResponseParsingError,
  LLMResponseValidationError,
  ExternalServiceError
} from "@panelcraft/shared";
import type { LLMClientPort } from "@panelcraft/comic-generation";

/**
 * xAI LLMClientPort implementation wrapping the Grok API.
 * Handles API communication, retry logic, timeout management, and domain error mapping.
 */
export class XaiLLMClientAdapter implements LLMClientPort {
  private readonly apiKey: string;
  private readonly debug = process.env['PANELCRAFT_DEBUG'] === 'true';

  constructor() {
    this.apiKey = process.env['XAI_API_KEY'] || '';
    if (!this.apiKey) {
      throw new Error('XAI_API_KEY environment variable is not set');
    }
  }

  /**
   * Calls xAI's Grok model via the OpenAI-compatible chat API.
   * Implements retry logic for transient failures (5xx, 429).
   * Throws custom domain errors on parse failure or validation issues.
   * Uses try...finally to guarantee timeout cleanup and preserves HTTP status codes.
   */
  async call(
    systemPrompt: string,
    userPrompt: string,
    maxRetries: number = 2
  ): Promise<any> {
    const retries = Math.max(0, Math.floor(maxRetries));

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout for reasoning

      try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'grok-2',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 2048,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          const isRetryable = response.status >= 500 || response.status === 429;

          const err = new ExternalServiceError(
            `xAI API returned ${response.status}: ${errorBody.substring(0, 100)}`,
            response.status,
            isRetryable
          );

          if (isRetryable && attempt < retries) {
            const backoffMs = 1000 * Math.pow(2, attempt);
            console.warn(
              `[Attempt ${attempt + 1}/${retries + 1}] xAI returned ${response.status}, ` +
              `retrying in ${backoffMs}ms...`
            );
            await new Promise((r) => setTimeout(r, backoffMs));
            continue;
          }
          throw err;
        }

        interface ChatResponse {
          choices: Array<{ message: { content: string } }>;
        }
        const json = (await response.json()) as ChatResponse;
        const content = json.choices[0]?.message.content;

        if (!content) {
          throw new LLMResponseParsingError('xAI returned empty response');
        }

        if (this.debug) {
          console.log(`[LLM Response] ${content.substring(0, 300)}...`);
        }

        try {
          return JSON.parse(content);
        } catch (parseError) {
          if (this.debug) {
            console.warn(`[LLM Parse Error] Invalid JSON: ${content.substring(0, 200)}`);
          }
          throw new LLMResponseParsingError(
            `LLM returned invalid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
            content.substring(0, 200)
          );
        }
      } catch (error) {
        if (
          error instanceof LLMResponseParsingError ||
          error instanceof LLMResponseValidationError ||
          (error instanceof ExternalServiceError && !error.retryable)
        ) {
          throw error;
        }

        if (attempt < retries) {
          const backoffMs = 1000 * Math.pow(2, attempt);
          console.warn(
            `[Attempt ${attempt + 1}/${retries + 1}] LLM call failed: ${(error as Error).message}, ` +
            `retrying in ${backoffMs}ms...`
          );
          await new Promise((r) => setTimeout(r, backoffMs));
        } else {
          if (error instanceof ExternalServiceError) throw error;
          throw new ExternalServiceError(
            `LLM call failed after ${retries + 1} attempts: ${(error as Error).message}`
          );
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }
}
