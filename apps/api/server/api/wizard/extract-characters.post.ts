import { defineEventHandler, readBody, setResponseStatus } from 'h3';
import { ok } from '../../utils/envelope.js';
import { parseBody } from '../../utils/validation.js';
import { ExtractCharactersSchema } from '../../utils/schemas.js';
import { getLLMClient } from '../../utils/dependencies.js';

/**
 * POST /api/wizard/extract-characters
 * Extract character list from prompt using LLM
 * @param event.body - { prompt: string, genres?: string[], tones?: string[] }
 * @returns { characters: CharacterValue[] }
 */
export default defineEventHandler(async (event) => {
  // Rate limiting handled globally by server/middleware/rate-limit.ts
  const { prompt, genres, tones } = parseBody(
    ExtractCharactersSchema,
    await readBody(event)
  );
  const llmClient = getLLMClient(event);

  try {
    const response = await llmClient.extractCharacters(prompt, {
      genres,
      tones,
    });
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
