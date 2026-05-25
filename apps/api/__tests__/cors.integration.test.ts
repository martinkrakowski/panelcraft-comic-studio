import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import {
  createApp,
  createRouter,
  toNodeListener,
  defineEventHandler,
} from 'h3';

vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: () => ({
    cors: {
      origin: ['http://localhost:3000', 'http://10.10.0.220:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    },
  }),
}));

import corsMiddleware from '../server/middleware/cors.js';

describe('CORS Middleware Integration Tests', () => {
  it('should handle OPTIONS preflight requests and return 204', async () => {
    const app = createApp();
    const router = createRouter();

    // Mount CORS middleware
    app.use(corsMiddleware);

    router.post(
      '/api/test',
      defineEventHandler(() => {
        return { success: true };
      })
    );
    app.use(router);

    const response = await request(toNodeListener(app))
      .options('/api/test')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000'
    );
    expect(response.headers['access-control-allow-methods']).toContain('POST');
  });

  it('should append CORS headers to GET requests', async () => {
    const app = createApp();
    const router = createRouter();

    // Mount CORS middleware
    app.use(corsMiddleware);

    router.get(
      '/api/test',
      defineEventHandler(() => {
        return { success: true };
      })
    );
    app.use(router);

    const response = await request(toNodeListener(app))
      .get('/api/test')
      .set('Origin', 'http://localhost:3000');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000'
    );
  });

  it('should not allow unauthorized origins', async () => {
    const app = createApp();
    const router = createRouter();

    app.use(corsMiddleware);

    router.get(
      '/api/test',
      defineEventHandler(() => {
        return { success: true };
      })
    );
    app.use(router);

    const response = await request(toNodeListener(app))
      .get('/api/test')
      .set('Origin', 'http://unauthorized.com');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  // h3's handleCors always returns 204 for OPTIONS regardless of origin — it simply
  // withholds the access-control-allow-origin header, which is enough for the browser
  // to reject the preflight. 403 would be more readable in DevTools but is not required
  // by the Fetch spec and would require bypassing handleCors entirely.
  it('should return 204 for OPTIONS from unauthorized origin but omit CORS headers', async () => {
    const app = createApp();
    const router = createRouter();

    app.use(corsMiddleware);

    router.post(
      '/api/test',
      defineEventHandler(() => {
        return { success: true };
      })
    );
    app.use(router);

    const response = await request(toNodeListener(app))
      .options('/api/test')
      .set('Origin', 'http://unauthorized.com')
      .set('Access-Control-Request-Method', 'POST');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
