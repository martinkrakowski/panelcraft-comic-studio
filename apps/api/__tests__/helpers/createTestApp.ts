import { createApp, createRouter, toNodeListener } from 'h3'
import { initComicUseCase } from '../../server/utils/dependencies.js'
import { handleServerError } from '../../server/utils/error.js'
import { ComicGenerationUseCase } from '@panelcraft/comic-generation'
import { InMemoryProjectRepository } from '@panelcraft/comic-project-management'
import listProjectsHandler from '../../server/api/projects/index.get.js'
import getProjectHandler from '../../server/api/projects/[id]/index.get.js'
import createProjectHandler from '../../server/api/projects/index.post.js'
import submitReviewHandler from '../../server/api/projects/[id]/review.post.js'

class MockJobQueue {
  async add(_name: string, _data: any) {
    return { id: 'mock-job' }
  }
}

export function createTestApp() {
  const projectRepo = new InMemoryProjectRepository()
  const comicUseCase = new ComicGenerationUseCase(projectRepo, new MockJobQueue() as any)
  initComicUseCase(comicUseCase)

  // Pass shared error handler for test-production parity
  const app = createApp({ onError: handleServerError })
  const router = createRouter()

  // Mount all routes — h3 router resolves path params correctly
  router.get('/api/projects', listProjectsHandler)
  router.post('/api/projects', createProjectHandler)
  router.get('/api/projects/:id', getProjectHandler)
  router.post('/api/projects/:id/review', submitReviewHandler)

  app.use(router)
  return { app: toNodeListener(app), projectRepo, comicUseCase }
}
