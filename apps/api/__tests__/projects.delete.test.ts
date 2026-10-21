import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Pool } from 'pg';
import { createApp, createRouter, toNodeListener } from 'h3';
import {
  ComicGenerationUseCase,
  InMemoryObjectStorage,
  type JobQueuePort,
} from '@panelcraft/comic-generation';
import {
  ComicProject,
  InMemoryProjectRepository,
  type OwnerId,
} from '@panelcraft/comic-project-management';
import { handleServerError } from '../server/utils/error.js';
import deleteProjectHandler from '../server/api/projects/[id]/index.delete.js';
import { setStorageForTests } from '../server/utils/storage.js';
import {
  HmacMediaUrlSigner,
  setMediaUrlsForTests,
} from '../server/utils/media-urls.js';
import { setPoolForTests } from '../server/utils/db.js';
import {
  createSession,
  deriveOwnerId,
  SESSION_COOKIE,
  type AuthUser,
} from '../server/utils/auth-session.js';
import type { LoggerPort } from '@panelcraft/shared';

const databaseUrl = process.env.TEST_DATABASE_URL;

const suite = databaseUrl ? describe : describe.skip;

const TEST_USER: AuthUser = {
  id: 'test-user',
  name: 'Test User',
  email: 'test@example.com',
  demo: false,
  provider: 'Test',
};
const TEST_SESSION_COOKIE = `${SESSION_COOKIE}=${createSession(TEST_USER, null)}`;

class MockJobQueue implements JobQueuePort {
  async add(_name: string, _data: Record<string, unknown>) {
    return { id: 'mock-job' };
  }
}

const mockLogger: LoggerPort = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

function makeProject(id: string): ComicProject {
  return ComicProject.fromJSON({
    id,
    prompt: 'A superhero story for the delete route test',
    panelCount: 2,
    panels: [
      {
        id: randomUUID(),
        prompt: 'Hero on a rooftop',
        status: 'generated',
        generatedImageUrl: null,
      },
      {
        id: randomUUID(),
        prompt: 'Hero landing',
        status: 'pending',
        generatedImageUrl: null,
      },
    ],
    characterBible: null,
    genres: ['action'],
    tones: [],
    styleReferences: {
      globalStylePrompt: '',
      moodBoardPreset: '',
      moodBoardImages: [],
    },
    coverImageUrl: null,
    composedImageUrl: null,
    selectedLayout: 'grid',
    layoutOptions: ['grid'],
    status: 'pending_creation',
    createdAt: new Date().toISOString(),
    lastReviewSubmittedAt: null,
  });
}

function buildApp(comicUseCase: ComicGenerationUseCase) {
  const app = createApp({ onError: handleServerError });
  const router = createRouter();

  app.use((event) => {
    event.context = event.context || {};
    event.context.comicUseCase = comicUseCase;
    if (!event.node.req.headers.cookie) {
      event.node.req.headers.cookie = TEST_SESSION_COOKIE;
    }
  });

  router.delete('/api/projects/:id', deleteProjectHandler);
  app.use(router);
  return toNodeListener(app);
}

suite('DELETE /api/projects/:id', () => {
  const ownerId: OwnerId = deriveOwnerId(TEST_USER);

  let pool: Pool;
  let adminPool: Pool;
  let schemaName: string;
  let storage: InMemoryObjectStorage;
  let projectRepo: InMemoryProjectRepository;
  let app: import('h3').NodeListener;

  beforeEach(async () => {
    const url = databaseUrl!;
    schemaName = `test_${Math.random().toString(36).slice(2, 10)}`;

    adminPool = new Pool({ connectionString: url });
    await adminPool.query(`CREATE SCHEMA ${schemaName}`);

    pool = new Pool({
      connectionString: url,
      options: `-c search_path=${schemaName}`,
    });

    const migrationPath = fileURLToPath(
      new URL('../../../db/migrations/001_init.sql', import.meta.url)
    );
    const migrationSql = readFileSync(migrationPath, 'utf8');
    await pool.query(migrationSql);

    setPoolForTests(pool);

    storage = new InMemoryObjectStorage();
    setStorageForTests(storage);
    setMediaUrlsForTests(
      new HmacMediaUrlSigner({
        baseUrl: 'http://localhost:3000',
        secret: 'test-secret',
      })
    );

    projectRepo = new InMemoryProjectRepository();
    const comicUseCase = new ComicGenerationUseCase(
      projectRepo,
      new MockJobQueue(),
      mockLogger
    );
    app = buildApp(comicUseCase);
  });

  afterEach(async () => {
    setPoolForTests(null);
    setStorageForTests(null);
    setMediaUrlsForTests(null);
    await pool.end();
    await adminPool.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
    await adminPool.end();
  });

  async function seedProject(projectId: string) {
    projectRepo.save(makeProject(projectId), ownerId);
    await pool.query(
      `INSERT INTO comic_projects (id, user_id, prompt, panel_count, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [projectId, ownerId.getValue(), 'A superhero story', 2, 'pending_creation']
    );
  }

  it('removes objects under both comics/<id>/ and <id>/ and keeps other projects', async () => {
    const projectId = randomUUID();
    const otherId = randomUUID();
    await seedProject(projectId);

    // Objects for the deleted project, split across the two prefixes.
    await storage.put(`comics/${projectId}/references/a.webp`, Buffer.from('a'), 'image/webp');
    await storage.put(`comics/${projectId}/panels/0.webp`, Buffer.from('p'), 'image/webp');
    await storage.put(`${projectId}/legacy/b.webp`, Buffer.from('b'), 'image/webp');

    // Another project's objects must survive.
    await storage.put(`comics/${otherId}/covers/front.webp`, Buffer.from('c'), 'image/webp');
    await storage.put(`${otherId}/legacy/d.webp`, Buffer.from('d'), 'image/webp');

    await pool.query(
      `INSERT INTO langgraph_checkpoints (thread_id, checkpoint_id, checkpoint)
       VALUES ($1, $2, $3)`,
      [projectId, 'cp1', JSON.stringify({})]
    );

    const res = await request(app).delete(`/api/projects/${projectId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ id: projectId, deleted: true });

    expect(await storage.listKeys(`comics/${projectId}/`)).toEqual([]);
    expect(await storage.listKeys(`${projectId}/`)).toEqual([]);
    expect(await storage.listKeys(`comics/${otherId}/`)).toEqual([
      `comics/${otherId}/covers/front.webp`,
    ]);
    expect(await storage.listKeys(`${otherId}/`)).toEqual([
      `${otherId}/legacy/d.webp`,
    ]);

    const projectRows = await pool.query(
      'SELECT count(*)::int AS n FROM comic_projects WHERE id = $1',
      [projectId]
    );
    expect(projectRows.rows[0].n).toBe(0);

    const checkpointRows = await pool.query(
      'SELECT count(*)::int AS n FROM langgraph_checkpoints WHERE thread_id = $1',
      [projectId]
    );
    expect(checkpointRows.rows[0].n).toBe(0);
  });

  it('returns 404 for a project the caller does not own', async () => {
    const projectId = randomUUID();

    // Insert into Postgres but do not seed the in-memory repo as owned, so
    // the ownership check fails exactly as it would for someone else's comic.
    await pool.query(
      `INSERT INTO comic_projects (id, user_id, prompt, panel_count, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [projectId, randomUUID(), 'Someone else', 2, 'pending_creation']
    );

    const res = await request(app).delete(`/api/projects/${projectId}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 when the project row is missing from Postgres', async () => {
    const projectId = randomUUID();

    // Owned in the in-memory repo, but no row in Postgres — the route's own
    // existence check must report 404 rather than deleting anything.
    projectRepo.save(makeProject(projectId), ownerId);
    await storage.put(`comics/${projectId}/panels/0.webp`, Buffer.from('p'), 'image/webp');

    const res = await request(app).delete(`/api/projects/${projectId}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');

    expect(await storage.listKeys(`comics/${projectId}/`)).toEqual([
      `comics/${projectId}/panels/0.webp`,
    ]);
  });
});
