import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Deterministic dummy values so integration tests are self-contained.
    // The exercised paths use Postgres and object storage but never hit the
    // network (no file uploads), so these don't need to be real.
    env: {
      DATABASE_URL: 'postgres://test:test@127.0.0.1:1/test',
      S3_ENDPOINT: 'http://127.0.0.1:1',
      S3_REGION: 'us-east-1',
      S3_BUCKET: 'test',
      S3_ACCESS_KEY_ID: 'test',
      S3_SECRET_ACCESS_KEY: 'test',
      APP_BASE_URL: 'http://localhost:3000',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['server/**/*.ts'],
      exclude: ['server/**/*.test.ts', 'server/**/*.spec.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './server'),
    },
  },
});
