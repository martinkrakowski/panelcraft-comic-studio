import { ComicGenerationUseCase } from '@panelcraft/comic-generation'

export function getComicUseCase(event: any): ComicGenerationUseCase {
  const useCase = event?.context?.comicUseCase as ComicGenerationUseCase | undefined
  if (!useCase) {
    throw new Error('Infrastructure not initialized: comicUseCase missing from context')
  }
  return useCase
}
