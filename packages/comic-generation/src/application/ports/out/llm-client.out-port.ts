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
}
