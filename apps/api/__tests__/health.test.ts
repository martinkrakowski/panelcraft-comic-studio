import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp, createRouter, toNodeListener } from 'h3';
import healthHandler from '../server/api/health.get.js';

describe('GET /api/health', () => {
  it('returns 200 with { ok: true }', async () => {
    const app = createApp();
    const router = createRouter();
    router.get('/api/health', healthHandler);
    app.use(router);

    const response = await request(toNodeListener(app)).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
