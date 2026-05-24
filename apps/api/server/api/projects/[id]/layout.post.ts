import { defineEventHandler, readBody, setResponseStatus } from 'h3';
import { ok } from '../../../utils/envelope.js';
import { parseBody } from '../../../utils/validation.js';
import { SelectLayoutSchema, ParamIdSchema } from '../../../utils/schemas.js';
import { getComicUseCase } from '../../../utils/dependencies.js';

/**
 * POST /api/projects/[id]/layout
 * Select layout for project and resume workflow
 * @param event.body - { selectedLayout: string }
 * @returns 200 with updated project
 */
export default defineEventHandler(async (event) => {
  const { id } = parseBody(ParamIdSchema, event.context.params);
  const { selectedLayout } = parseBody(
    SelectLayoutSchema,
    await readBody(event)
  );
  const useCase = getComicUseCase(event);

  try {
    // Update project with selected layout
    await useCase.selectLayout(id, selectedLayout);

    // Enqueue resume-comic job
    await useCase.enqueueResumeComic(id, selectedLayout);

    setResponseStatus(event, 200);
    return ok({ id, selectedLayout, status: 'pending_review' });
  } catch (error) {
    setResponseStatus(event, 500);
    return {
      error: 'Failed to select layout',
      details: error instanceof Error ? error.message : '',
    };
  }
});
