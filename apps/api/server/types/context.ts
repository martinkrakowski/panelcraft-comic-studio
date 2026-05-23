import 'h3'
import { ComicGenerationUseCase } from '@panelcraft/comic-generation'

declare module 'h3' {
  interface H3EventContext {
    comicUseCase?: ComicGenerationUseCase
  }
}
