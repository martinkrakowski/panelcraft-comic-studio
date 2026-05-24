import { defineEventHandler, readBody, setResponseStatus } from 'h3';
import { ok } from '../../utils/envelope.js';
import { parseBody } from '../../utils/validation.js';
import { ExtractCharactersSchema } from '../../utils/schemas.js';
import { getLLMClient } from '../../utils/dependencies.js';
import { checkRateLimit } from '../../utils/rate-limiter.js';

/**
 * POST /api/wizard/extract-characters
 * Extract character list from prompt using LLM
 * @param event.body - { prompt: string, genres?: string[], tones?: string[] }
 * @returns { characters: CharacterValue[] }
 */
export default defineEventHandler(async (event) => {
  // Rate limiting: 10 requests per minute per IP
  const clientIp =
    event.node.req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    event.node.req.socket.remoteAddress ||
    'unknown';
  const { allowed, retryAfter } = checkRateLimit(clientIp);

  if (!allowed) {
    setResponseStatus(event, 429);
    return {
      error: 'Too many requests',
      retryAfter: `${retryAfter} seconds`,
    };
  }

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
