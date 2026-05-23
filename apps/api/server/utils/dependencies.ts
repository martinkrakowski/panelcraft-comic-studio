import { H3Event, EventHandlerRequest } from 'h3'
import { ComicGenerationUseCase } from '@panelcraft/comic-generation'
import '../types/context.js'

/**
 * Retrieve the injected ComicGenerationUseCase from the current request context.
 *
 * The use case is injected by the Nitro 'request' hook in server/plugins/init.ts
 * before handlers execute. Each request gets its own instance via event.context.comicUseCase
 * (augmented via H3EventContext module declaration in types/context.ts).
 *
 * @param event - H3Event with injected dependencies in event.context
 * @returns ComicGenerationUseCase instance for this request
 * @throws {Error} If comicUseCase is missing from event.context (initialization failure)
 *
 * @example
 * ```typescript
 * export default defineEventHandler(async (event) => {
 *   const useCase = getComicUseCase(event)
 *   const projects = await useCase.listProjects()
 * })
 * ```
 */
export function getComicUseCase(event: H3Event<EventHandlerRequest>): ComicGenerationUseCase {
  if (!event.context?.comicUseCase) {
    throw new Error('Infrastructure not initialized: comicUseCase missing from context')
  }
  return event.context.comicUseCase
}
