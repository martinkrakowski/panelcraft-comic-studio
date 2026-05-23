import { createApp, createRouter, toNodeListener } from 'h3'
import { handleServerError } from '../../server/utils/error.js'
import { ComicGenerationUseCase } from '@panelcraft/comic-generation'
import { InMemoryProjectRepository } from '@panelcraft/comic-project-management'
import listProjectsHandler from '../../server/api/projects/index.get.js'
import getProjectHandler from '../../server/api/projects/[id]/index.get.js'
import createProjectHandler from '../../server/api/projects/index.post.js'
import submitReviewHandler from '../../server/api/projects/[id]/review.post.js'

/**
 * Mock job queue adapter for testing.
 * Returns a fixed job ID without requiring Redis/BullMQ infrastructure.
 */
class MockJobQueue {
  async add(_name: string, _data: any) {
    return { id: 'mock-job' }
  }
}

/**
 * Create an isolated test application with mock dependencies.
 *
 * Initializes an in-memory project repository, mock job queue, and h3 app
 * with all project-related routes mounted. Useful for integration testing
 * without external dependencies like Redis or real LLM services.
 *
 * @returns Object with app (h3 Node listener), projectRepo, and comicUseCase for assertions
 */
export function createTestApp() {
  const projectRepo = new InMemoryProjectRepository()
  const comicUseCase = new ComicGenerationUseCase(projectRepo, new MockJobQueue() as any)

  // Pass shared error handler for test-production parity
  const app = createApp({ onError: handleServerError })
  const router = createRouter()

  // Inject dependencies into request context (mirrors production init.ts behavior)
  app.use((event) => {
    event.context = event.context || {}
    event.context.comicUseCase = comicUseCase
  })

  // Mount all routes — h3 router resolves path params correctly
  router.get('/api/projects', listProjectsHandler)
  router.post('/api/projects', createProjectHandler)
  router.get('/api/projects/:id', getProjectHandler)
  router.post('/api/projects/:id/review', submitReviewHandler)

  // Test-only route for error handler testing
  router.get('/error-test', () => {
    throw new Error('Intentional test error')
  })

  app.use(router)
  return { app: toNodeListener(app), projectRepo, comicUseCase }
}
