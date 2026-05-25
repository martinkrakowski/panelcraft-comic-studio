import { defineEventHandler, readBody, setResponseStatus } from 'h3';
import { ok } from '../../utils/envelope.js';
import { parseBody } from '../../utils/validation.js';
import { AnalyzePromptSchema } from '../../utils/schemas.js';
import { getLLMClient } from '../../utils/dependencies.js';

/**
 * POST /api/wizard/analyze-prompt
 * Analyze user's story prompt using LLM and return feedback + suggestions
 * @param event.body - { prompt: string }
 * @returns { feedback: string, estimatedCharactersCount: number, suggestedGenres: string[], suggestedTones: string[] }
 */
export default defineEventHandler(async (event) => {
  // Rate limiting handled globally by server/middleware/rate-limit.ts
  const { prompt } = parseBody(AnalyzePromptSchema, await readBody(event));
  const llmClient = getLLMClient(event);

  try {
    const response = await llmClient.analyzePrompt(prompt);
    setResponseStatus(event, 200);
    return ok(response);
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      setResponseStatus(event, 408);
      return { error: 'LLM request timed out. Please try again.' };
    }
    throw error;
  }
});
