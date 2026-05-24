/**
 * LLMClientPort defines the contract for interacting with LLM services.
 *
 * This is an outbound port in the Hexagonal Architecture pattern.
 * Implement this interface in your infrastructure adapter (e.g., xAI, OpenAI, Anthropic).
 */
export interface LLMClientPort {
  /**
   * Call an LLM with system and user prompts.
   * Implements retry logic and error handling internally.
   *
   * @param systemPrompt The system context for the LLM
   * @param userPrompt The user's request
   * @returns Parsed JSON response from the LLM
   * @throws LLMResponseParsingError if response is not valid JSON
   * @throws LLMResponseValidationError if response structure is invalid
   * @throws ExternalServiceError if LLM service call fails
   */
  call(
    systemPrompt: string,
    userPrompt: string
  ): Promise<Record<string, unknown>>;

  /**
   * Analyze a story prompt and return feedback + suggestions
   * @param prompt User's story prompt
   * @returns Feedback, estimated character count, suggested genres/tones
   */
  analyzePrompt(prompt: string): Promise<{
    feedback: string;
    estimatedCharactersCount: number;
    suggestedGenres: string[];
    suggestedTones: string[];
  }>;

  /**
   * Extract characters from a story prompt
   * @param prompt User's story prompt
   * @param options Genres and tones for context
   * @returns List of extracted characters
   */
  extractCharacters(
    prompt: string,
    options?: { genres?: string[]; tones?: string[] }
  ): Promise<{ characters: Array<Record<string, unknown>> }>;
}
