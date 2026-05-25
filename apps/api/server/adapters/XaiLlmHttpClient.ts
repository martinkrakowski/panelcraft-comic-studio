import {
  LLMResponseParsingError,
  LLMResponseValidationError,
  ExternalServiceError,
  LoggerPort,
} from '@panelcraft/shared';

const CHAT_ENDPOINT = 'https://api.x.ai/v1/chat/completions';
const TIMEOUT_MS = 45_000;

interface ChatResponse {
  choices: Array<{ message: { content: string } }>;
}

export class XaiLlmHttpClient {
  constructor(
    private readonly apiKey: string,
    private readonly logger: LoggerPort
  ) {}

  async call(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    maxRetries = 2
  ): Promise<Record<string, unknown>> {
    if (!this.apiKey) {
      throw new Error(
        'XAI_API_KEY environment variable is not set. Please set it in your .env file.'
      );
    }
    const retries = Math.max(0, Math.floor(maxRetries));

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await fetch(CHAT_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
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
            this.logger.warn(
              `[Attempt ${attempt + 1}/${retries + 1}] xAI returned ${response.status}, retrying in ${backoffMs}ms...`
            );
            await new Promise((r) => setTimeout(r, backoffMs));
            continue;
          }
          throw err;
        }

        const json = (await response.json()) as ChatResponse;
        const content = json.choices[0]?.message.content;

        if (!content) {
          throw new LLMResponseParsingError('xAI returned empty response');
        }

        this.logger.debug('[LLM Response] Content received', {
          contentLength: content.length,
          model,
        });

        try {
          return JSON.parse(content) as Record<string, unknown>;
        } catch (parseError) {
          this.logger.warn('[LLM Parse Error] Invalid JSON received', {
            contentLength: content.length,
            parseError:
              parseError instanceof Error
                ? parseError.message
                : String(parseError),
          });
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
          this.logger.warn(
            `[Attempt ${attempt + 1}/${retries + 1}] LLM call failed: ${(error as Error).message}, retrying in ${backoffMs}ms...`
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
    throw new ExternalServiceError('LLM call completed without response');
  }
}
