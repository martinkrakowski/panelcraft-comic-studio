import { LLMResponseValidationError } from '@panelcraft/shared';

/**
 * Validates LLM-generated panel prompts to ensure they meet structural and content requirements.
 * Encapsulates validation rules for panel descriptions.
 */
export class PanelPromptValidationService {
  /**
   * Validates that the LLM response is an array of the expected count.
   */
  static validateArrayStructure(
    response: unknown,
    expectedCount: number
  ): void {
    if (!Array.isArray(response)) {
      throw new LLMResponseValidationError(
        `Panel prompts must be an array, got ${typeof response}`,
        `array of ${expectedCount} strings`,
        typeof response
      );
    }

    if (response.length !== expectedCount) {
      throw new LLMResponseValidationError(
        `Requested ${expectedCount} panels but LLM returned ${response.length}`,
        expectedCount,
        response.length
      );
    }
  }

  /**
   * Validates that each panel prompt is a non-empty string.
   */
  static validatePanelContent(prompts: unknown[]): void {
    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      if (typeof prompt !== 'string' || !prompt.trim()) {
        throw new LLMResponseValidationError(
          `Panel ${i} is empty or not a string`,
          'non-empty string',
          prompt
        );
      }
    }
  }

  /**
   * Full validation: structure + content
   */
  static validate(response: unknown, expectedCount: number): void {
    this.validateArrayStructure(response, expectedCount);
    this.validatePanelContent(response as unknown[]);
  }
}
