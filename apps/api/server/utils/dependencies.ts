import { ComicGenerationUseCase } from '@panelcraft/comic-generation'

let _comicUseCase: ComicGenerationUseCase | null = null

export function getComicUseCase(): ComicGenerationUseCase {
  if (!_comicUseCase) throw new Error('Infrastructure not initialized')
  return _comicUseCase
}

export function initComicUseCase(useCase: ComicGenerationUseCase): void {
  _comicUseCase = useCase
}
