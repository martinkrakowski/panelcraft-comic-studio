import { defineEventHandler, readBody, setResponseStatus } from 'h3';
import { ok } from '../../utils/envelope.js';
import { parseBody } from '../../utils/validation.js';
import { AnalyzePromptSchema } from '../../utils/schemas.js';
import { getLLMClient } from '../../utils/dependencies.js';
import { checkRateLimit } from '../../utils/rate-limiter.js';

/**
 * POST /api/wizard/analyze-prompt
 * Analyze user's story prompt using LLM and return feedback + suggestions
 * @param event.body - { prompt: string }
 * @returns { feedback: string, estimatedCharactersCount: number, suggestedGenres: string[], suggestedTones: string[] }
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
