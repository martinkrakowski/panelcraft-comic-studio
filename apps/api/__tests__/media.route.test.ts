import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp, createRouter, toNodeListener } from 'h3';
import { InMemoryObjectStorage } from '@panelcraft/comic-generation';
import mediaHandler from '../server/api/media/[...key].get.js';
import { setStorageForTests } from '../server/utils/storage.js';
import {
  HmacMediaUrlSigner,
  setMediaUrlsForTests,
} from '../server/utils/media-urls.js';

const BASE_URL = 'http://localhost:3001';
const KEY = 'comics/p1/panels/01.webp';
const BYTES = Buffer.from('fake-webp-bytes');

describe('GET /api/media/**', () => {
  let app: import('h3').NodeListener;
  let storage: InMemoryObjectStorage;
  let now: number;
  let signer: HmacMediaUrlSigner;

  beforeEach(() => {
    storage = new InMemoryObjectStorage();
    now = 1000;
    signer = new HmacMediaUrlSigner({
      baseUrl: BASE_URL,
      secret: 'test-secret',
      now: () => now,
    });
    setStorageForTests(storage);
    setMediaUrlsForTests(signer);

    const router = createRouter();
    // Nitro maps `[...key].get.ts` to the catch-all route `/api/media/**:key`,
    // so the handler reads the key via `getRouterParam(event, 'key')`.
    router.get('/api/media/**:key', mediaHandler);
    const appInstance = createApp();
    appInstance.use(router);
    app = toNodeListener(appInstance);
  });

  afterEach(() => {
    setStorageForTests(null);
    setMediaUrlsForTests(null);
  });

  const signedPath = (key = KEY) => {
    const url = signer.urlFor(key);
    return url.slice(BASE_URL.length);
  };

  it('serves a valid signed link with the expected headers', async () => {
    await storage.put(KEY, BYTES, 'image/webp');

    const res = await request(app).get(signedPath());

    expect(res.status).toBe(200);
    expect(res.body.equals(BYTES)).toBe(true);
    expect(res.headers['content-type']).toBe('image/webp');
    expect(res.headers['content-length']).toBe(String(BYTES.length));
    expect(res.headers['cache-control']).toMatch(/^private, max-age=\d+$/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns 403 for a bad signature', async () => {
    await storage.put(KEY, BYTES, 'image/webp');
    const path = signedPath();
    const tampered = path.replace(/sig=[^&]+$/, (m) =>
      m.endsWith('A') ? m.slice(0, -1) + 'B' : m.slice(0, -1) + 'A'
    );

    const res = await request(app).get(tampered);

    expect(res.status).toBe(403);
  });

  it('returns 403 for an expired link', async () => {
    await storage.put(KEY, BYTES, 'image/webp');
    const path = signedPath();
    now = 1000 + 3600 + 1; // past expiry

    const res = await request(app).get(path);

    expect(res.status).toBe(403);
  });

  it('returns 403 for a missing signature', async () => {
    await storage.put(KEY, BYTES, 'image/webp');
    const path = signedPath().split('?')[0];

    const res = await request(app).get(path);

    expect(res.status).toBe(403);
  });

  it('returns 404 for a missing object', async () => {
    const res = await request(app).get(signedPath());
    expect(res.status).toBe(404);
  });

  it('returns 400 for a disallowed key', async () => {
    const res = await request(app).get('/api/media/comics?exp=1000&sig=x');
    expect(res.status).toBe(400);
  });

  it('returns 400 for a path-traversal-shaped key', async () => {
    const res = await request(app).get(
      '/api/media/comics/a%2F..%2Fb?exp=1000&sig=x'
    );
    expect(res.status).toBe(400);
  });

  it('serves non-image content as octet-stream with attachment disposition', async () => {
    await storage.put(KEY, Buffer.from('pdf-bytes'), 'application/pdf');

    const res = await request(app).get(signedPath());

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/octet-stream');
    expect(res.headers['content-disposition']).toBe('attachment');
  });

  it('never serves SVG inline (same-origin script risk)', async () => {
    await storage.put(
      KEY,
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
      'image/svg+xml'
    );

    const res = await request(app).get(signedPath());

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/octet-stream');
    expect(res.headers['content-disposition']).toBe('attachment');
    expect(res.headers['content-security-policy']).toContain(
      "default-src 'none'"
    );
  });
});
