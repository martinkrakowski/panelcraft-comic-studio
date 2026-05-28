import { createApp, createRouter, toNodeListener } from 'h3';
import { handleServerError } from '../../server/utils/error.js';
import { ComicGenerationUseCase } from '@panelcraft/comic-generation';
import { InMemoryProjectRepository } from '@panelcraft/comic-project-management';
import listProjectsHandler from '../../server/api/projects/index.get.js';
import getProjectHandler from '../../server/api/projects/[id]/index.get.js';
import createProjectHandler from '../../server/api/projects/index.post.js';
import submitReviewHandler from '../../server/api/projects/[id]/review.post.js';
import {
  createSession,
  SESSION_COOKIE,
  type AuthUser,
} from '../../server/utils/auth-session.js';
import type { LoggerPort } from '@panelcraft/shared';
import type { JobQueuePort } from '@panelcraft/comic-generation';

// Fixed identity used to authenticate test requests. The project routes now
// require a session; injecting a consistent user keeps ownership stable so
// create -> list -> get -> review all resolve to the same owner.
const TEST_USER: AuthUser = {
  id: 'test-user',
  name: 'Test User',
  email: 'test@example.com',
  demo: false,
  provider: 'Test',
};
const TEST_SESSION_COOKIE = `${SESSION_COOKIE}=${createSession(TEST_USER, null)}`;

/**
 * Mock job queue adapter for testing.
 * Returns a fixed job ID without requiring Redis/BullMQ infrastructure.
 */
class MockJobQueue implements JobQueuePort {
  async add(_name: string, _data: Record<string, unknown>) {
    return { id: 'mock-job' };
  }
}

/**
 * Create an isolated test application with mock dependencies.
 *
 * Initializes an in-memory project repository, mock job queue, and h3 app
 * with all project-related routes mounted. Useful for integration testing
 * without external dependencies like Redis or real LLM services.
 *
 * @param logger - Optional LoggerPort instance. If not provided, a no-op logger is used.
 * @returns Object with app (h3 Node listener), projectRepo, and comicUseCase for assertions
 */
export function createTestApp(logger?: LoggerPort) {
  const projectRepo = new InMemoryProjectRepository();
  const mockLogger: LoggerPort = logger || {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
  const comicUseCase = new ComicGenerationUseCase(
    projectRepo,
    new MockJobQueue(),
    mockLogger
  );

  // Pass shared error handler for test-production parity
  const app = createApp({ onError: handleServerError });
  const router = createRouter();

  // Inject dependencies into request context (mirrors production init.ts behavior)
  // and authenticate the request as the fixed test user unless the caller has
  // supplied its own cookie (so a test can still exercise the logged-out path).
  app.use((event) => {
    event.context = event.context || {};
    event.context.comicUseCase = comicUseCase;
    if (!event.node.req.headers.cookie) {
      event.node.req.headers.cookie = TEST_SESSION_COOKIE;
    }
  });

  // Mount all routes — h3 router resolves path params correctly
  router.get('/api/projects', listProjectsHandler);
  router.post('/api/projects', createProjectHandler);
  router.get('/api/projects/:id', getProjectHandler);
  router.post('/api/projects/:id/review', submitReviewHandler);

  // Test-only route for error handler testing
  router.get('/error-test', () => {
    throw new Error('Intentional test error');
  });

  app.use(router);
  return { app: toNodeListener(app), projectRepo, comicUseCase };
}
